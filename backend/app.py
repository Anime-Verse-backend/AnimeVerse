import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from functools import wraps
import re
import resend
import json
import tempfile

from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import joinedload, scoped_session, sessionmaker
from sqlalchemy import create_engine, text, func, inspect, or_
from sqlalchemy.exc import OperationalError

from flask_marshmallow import Marshmallow
from marshmallow import fields, Schema
from passlib.context import CryptContext
import jwt
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv


# --- 0. Load Environment Variables ---
load_dotenv()

# --- 1. App Initialization ---
app = Flask(__name__)
CORS(app) # Allow all origins for development

# --- 2. Configuration ---
APP_ROOT = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(APP_ROOT, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


DB_USER = os.environ.get('DB_USER', 'root')
DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', 3306)
DB_NAME = os.environ.get('DB_NAME', 'defaultdb')
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'default-super-secret-key-for-dev')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
FROM_EMAIL = os.environ.get('FROM_EMAIL', 'onboarding@resend.dev')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
# This is the new variable for the backend's public URL
BACKEND_PUBLIC_URL = os.environ.get('BACKEND_PUBLIC_URL', 'http://127.0.0.1:8000')

# --- SSL Configuration Helper ---
def get_ssl_ca_path():
    """
    Determines the path to the SSL CA certificate.
    If DB_SSL_CA contains certificate content, it writes it to a temporary file.
    If it's a path, it returns the path.
    """
    ssl_ca_value = os.environ.get('DB_SSL_CA')
    if not ssl_ca_value:
        return None
    
    # Check if the value is a path to an existing file
    if os.path.exists(ssl_ca_value):
        return ssl_ca_value
        
    # If not a path, assume it's the cert content and write to a temp file
    if '-----BEGIN CERTIFICATE-----' in ssl_ca_value:
        try:
            # Create a temporary file that persists for the life of the process
            with tempfile.NamedTemporaryFile(delete=False, mode='w', suffix='.pem', prefix='ca-cert-') as temp_ca_file:
                temp_ca_file.write(ssl_ca_value)
                # Return the path to the temporary file
                return temp_ca_file.name
        except Exception as e:
            print(f"Error creating temporary CA file: {e}")
            return None
    
    # Fallback for cases where it might be a filename in a specific location
    # This might fail on Render if the path isn't absolute, but it's a last resort
    return ssl_ca_value


DB_SSL_CA = get_ssl_ca_path()

# Build the connection string
db_uri = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine_options = {'pool_recycle': 280}

if DB_SSL_CA:
    engine_options['connect_args'] = {'ssl_ca': DB_SSL_CA}

app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = engine_options
app.config['JWT_SECRET_KEY'] = JWT_SECRET_KEY
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# Set max content length for file uploads (e.g., 16MB)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# --- Database Auto-Creation ---
def ensure_database_exists():
    try:
        # Connect to the MySQL server (without specifying a database)
        server_uri = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}"
        connect_args = {}
        if DB_SSL_CA:
            # Use the same logic for the pre-check connection
            connect_args['ssl_ca'] = DB_SSL_CA

        engine = create_engine(server_uri, connect_args=connect_args)
        with engine.connect() as connection:
            # Check if the database exists and create it if it doesn't
            connection.execute(text(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}"))
        print(f"Database '{DB_NAME}' ensured.")
    except OperationalError as e:
        # Handle cases where MySQL server isn't running or credentials are wrong
        print(f"Could not connect to MySQL server: {e}")
        # Depending on the desired behavior, you might want to exit here
        # For now, we'll let it fail on SQLAlchemy initialization
    except Exception as e:
        print(f"An unexpected error occurred during database check: {e}")

# Call the function to ensure DB exists before initializing SQLAlchemy with the full URI
ensure_database_exists()

db = SQLAlchemy(app)
ma = Marshmallow(app)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
if RESEND_API_KEY:
    resend.api_key = resend.api_key

# We will create the session factory within the app context to avoid runtime errors
db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False))

def init_db_session():
    """Binds the session to the engine within the app context."""
    db_session.configure(bind=db.engine)

@app.teardown_appcontext
def shutdown_session(exception=None):
    db_session.remove()


# --- 3. Database Models (SQLAlchemy) ---
anime_genres_table = db.Table('anime_genres',
    db.Column('anime_id', db.String(36), db.ForeignKey('animes.id'), primary_key=True),
    db.Column('genre_id', db.Integer, db.ForeignKey('genres.id'), primary_key=True)
)

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    username = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(10), nullable=False, default="user") # owner, co-owner, admin, user
    status = db.Column(db.String(10), nullable=False, default="active") # active, disabled
    avatar_url = db.Column(db.Text)
    bio = db.Column(db.Text)
    show_activity = db.Column(db.Boolean, default=True)
    joined = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp(), nullable=False)
    reset_password_token = db.Column(db.String(255), unique=True, nullable=True)
    reset_password_expiration = db.Column(db.DateTime, nullable=True)
    comments = db.relationship("Comment", backref="author", lazy=True, cascade="all, delete-orphan")
    staff_chat_messages = db.relationship("StaffChatMessage", backref="author", lazy=True, cascade="all, delete-orphan")
    support_tickets = db.relationship("SupportTicket", backref="user", lazy=True, foreign_keys="SupportTicket.user_id")


class Anime(db.Model):
    __tablename__ = "animes"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    audience = db.Column(db.String(10), nullable=False)
    rating = db.Column(db.DECIMAL(3, 1))
    image_url = db.Column(db.Text)
    trailer_url = db.Column(db.String(255))
    status = db.Column(db.String(15), nullable=False)
    announcement = db.Column(db.Text)
    is_featured = db.Column(db.Boolean, nullable=False, default=False)
    seasons = db.relationship("Season", backref="anime", lazy="subquery", cascade="all, delete-orphan")
    comments = db.relationship("Comment", backref="anime", lazy="subquery", cascade="all, delete-orphan", order_by="desc(Comment.timestamp)")
    genres = db.relationship("Genre", secondary=anime_genres_table, backref="animes", lazy='subquery')

class Genre(db.Model):
    __tablename__ = "genres"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

class Season(db.Model):
    __tablename__ = "seasons"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    title = db.Column(db.String(100), nullable=False)
    anime_id = db.Column(db.String(36), db.ForeignKey("animes.id"), nullable=False)
    episodes = db.relationship(
        "Episode", 
        backref="season", 
        lazy="subquery", 
        cascade="all, delete-orphan",
        order_by="Episode.title"  # Basic alphabetical sort
    )


class Episode(db.Model):
    __tablename__ = "episodes"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    title = db.Column(db.String(255), nullable=False)
    duration = db.Column(db.Integer)
    synopsis = db.Column(db.Text)
    season_id = db.Column(db.String(36), db.ForeignKey("seasons.id"), nullable=False)
    sources = db.relationship("EpisodeSource", backref="episode", lazy="subquery", cascade="all, delete-orphan")
    comments = db.relationship("EpisodeComment", backref="episode", lazy="subquery", cascade="all, delete-orphan", order_by="desc(EpisodeComment.timestamp)")

class EpisodeSource(db.Model):
    __tablename__ = "episode_sources"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    server = db.Column(db.String(100), nullable=False)
    url = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(20), nullable=False)
    type = db.Column(db.String(10), nullable=False, default='url') # 'url' or 'iframe'
    episode_id = db.Column(db.String(36), db.ForeignKey("episodes.id"), nullable=False)


class Comment(db.Model):
    __tablename__ = "comments"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    text = db.Column(db.Text)
    media_url = db.Column(db.Text)
    timestamp = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp(), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    anime_id = db.Column(db.String(36), db.ForeignKey("animes.id"), nullable=False)
    parent_id = db.Column(db.String(36), db.ForeignKey("comments.id"), nullable=True)
    replies = db.relationship("Comment", backref=db.backref('parent', remote_side=[id]), lazy="subquery", cascade="all, delete-orphan")
    is_deleted = db.Column(db.Boolean, default=False)

class EpisodeComment(db.Model):
    __tablename__ = "episode_comments"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    text = db.Column(db.Text)
    media_url = db.Column(db.Text)
    timestamp = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp(), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    episode_id = db.Column(db.String(36), db.ForeignKey("episodes.id"), nullable=False)
    parent_id = db.Column(db.String(36), db.ForeignKey("episode_comments.id"), nullable=True)
    replies = db.relationship("EpisodeComment", backref=db.backref('parent', remote_side=[id]), lazy="subquery", cascade="all, delete-orphan")
    is_deleted = db.Column(db.Boolean, default=False)
    author = db.relationship("User")

class StaffChatMessage(db.Model):
    __tablename__ = "staff_chat_messages"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    text = db.Column(db.Text)
    media_url = db.Column(db.Text)
    timestamp = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp(), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    parent_id = db.Column(db.String(36), db.ForeignKey("staff_chat_messages.id"), nullable=True)
    replies = db.relationship("StaffChatMessage", backref=db.backref('parent', remote_side=[id]), lazy="subquery", cascade="all, delete-orphan")
    is_deleted = db.Column(db.Boolean, default=False)

class SupportTicket(db.Model):
    __tablename__ = 'support_tickets'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_email = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp(), nullable=False)
    status = db.Column(db.String(20), default='open') # open, in-progress, closed
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    ticket_type = db.Column(db.String(50), nullable=True)

class Ally(db.Model):
    __tablename__ = 'allies'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    name = db.Column(db.String(100), nullable=False)
    image_url = db.Column(db.Text)
    description = db.Column(db.Text)
    main_url = db.Column(db.String(255))
    social_media = db.Column(db.JSON)
    is_featured = db.Column(db.Boolean, default=False)

class Developer(db.Model):
    __tablename__ = 'developers'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(100))
    image_url = db.Column(db.Text)
    social_media = db.Column(db.JSON)


# --- 4. Serialization Schemas (Marshmallow) ---
def make_url_absolute(path):
    if not path or path.startswith(('http://', 'https://', 'blob:', 'data:')):
        return path
    
    # Use the explicitly set public URL for the backend
    base_url = BACKEND_PUBLIC_URL.rstrip('/')
        
    # Ensure there's a single leading slash
    if not path.startswith('/'):
        path = f'/{path}'
        
    return f"{base_url}{path}"


class GenreSchema(ma.Schema):
    class Meta:
        model = Genre
        fields = ("id", "name")
    id = fields.Int(dump_only=True)
    name = fields.Str()

class UserSchema(ma.Schema):
    id = fields.Str(dump_only=True)
    username = fields.Str()
    name = fields.Str()
    email = fields.Email()
    role = fields.Str()
    status = fields.Str()
    avatarUrl = fields.Method("get_avatar_url", dump_only=True, data_key="avatarUrl")
    bio = fields.Str()
    showActivity = fields.Boolean(attribute="show_activity", data_key="showActivity")
    joined = fields.DateTime(dump_only=True, format='iso')

    def get_avatar_url(self, obj):
        # Data URIs are returned as is.
        if obj.avatar_url and obj.avatar_url.startswith('data:'):
            return obj.avatar_url
        # For legacy file paths, make them absolute
        return make_url_absolute(obj.avatar_url) if obj.avatar_url else None


class BaseCommentSchema(Schema):
    id = fields.Str(dump_only=True)
    text = fields.Str()
    author = fields.Nested(lambda: UserSchema(only=("id", "username", "name", "role", "avatarUrl")), dump_only=True)
    timestamp = fields.DateTime(format='iso', dump_only=True)
    mediaUrl = fields.Method("get_media_url", data_key="mediaUrl")
    isDeleted = fields.Boolean(attribute="is_deleted", dump_only=True, data_key="isDeleted")

    def get_media_url(self, obj):
        if obj.media_url and obj.media_url.startswith('data:'):
            return obj.media_url
        return make_url_absolute(obj.media_url) if hasattr(obj, 'media_url') and obj.media_url else None

class ParentCommentSchema(BaseCommentSchema):
     class Meta:
        fields = ("id", "text", "author", "isDeleted")

class CommentSchema(BaseCommentSchema):
    parent = fields.Nested(ParentCommentSchema, dump_only=True)
    replies = fields.List(fields.Nested("CommentSchema"), dump_only=True)


class CommentForProfileSchema(Schema):
    anime_title = fields.String(attribute="anime.title", dump_only=True)
    anime_id = fields.String(attribute="anime.id", dump_only=True)
    text = fields.String()
    timestamp = fields.DateTime(format='iso', dump_only=True)

class PublicUserSchema(Schema):
    id = fields.Str(dump_only=True)
    username = fields.Str()
    name = fields.Str()
    avatarUrl = fields.Method("get_avatar_url", dump_only=True, data_key="avatarUrl")
    bio = fields.Str()
    joined = fields.DateTime(dump_only=True, format='iso')
    comments = fields.Method("get_public_comments")

    def get_avatar_url(self, obj):
        if obj.avatar_url and obj.avatar_url.startswith('data:'):
            return obj.avatar_url
        return make_url_absolute(obj.avatar_url) if obj.avatar_url else None
    
    def get_public_comments(self, obj):
        if not obj.show_activity:
            return []
        # Limit to 10 most recent comments
        recent_comments = db_session.query(Comment).filter_by(user_id=obj.id, is_deleted=False).order_by(Comment.timestamp.desc()).limit(10).all()
        return CommentForProfileSchema(many=True).dump(recent_comments)

class ParentEpisodeCommentSchema(BaseCommentSchema):
    class Meta:
        model = EpisodeComment
        fields = ("id", "text", "author", "isDeleted")

class EpisodeCommentSchema(BaseCommentSchema):
    parent = fields.Nested(ParentEpisodeCommentSchema, dump_only=True)
    replies = fields.List(fields.Nested("EpisodeCommentSchema"), dump_only=True)
    author = fields.Nested(lambda: UserSchema(only=("id", "username", "name", "role", "avatarUrl")), dump_only=True)

class ParentMessageSchema(Schema):
    id = fields.Str(dump_only=True)
    text = fields.Str()
    author = fields.Nested(lambda: UserSchema(only=("name",)), dump_only=True)
    isDeleted = fields.Boolean(attribute="is_deleted", dump_only=True, data_key="isDeleted")

class StaffChatMessageSchema(BaseCommentSchema):
    author = fields.Nested(lambda: UserSchema(only=("id", "username", "name", "role", "avatarUrl")), dump_only=True)
    parent = fields.Nested(ParentMessageSchema, dump_only=True)
    replies = fields.List(fields.Nested("StaffChatMessageSchema"), dump_only=True)

class EpisodeSourceSchema(ma.Schema):
    id = fields.Str(dump_only=True)
    server = fields.Str()
    url = fields.Str()
    language = fields.Str()
    type = fields.Str()


class EpisodeSchema(ma.Schema):
    id = fields.Str(dump_only=True)
    title = fields.Str()
    duration = fields.Int()
    synopsis = fields.Str()
    sources = fields.Nested(EpisodeSourceSchema, many=True)
    comments = fields.Nested(EpisodeCommentSchema, many=True, dump_only=True)
    seasonId = fields.String(attribute="season_id", dump_only=True)

class SeasonSchema(ma.Schema):
    id = fields.Str(dump_only=True)
    title = fields.Str()
    episodes = fields.Nested(EpisodeSchema, many=True)
    animeId = fields.String(attribute="anime_id", dump_only=True)

class AnimeSchema(ma.Schema):
    id = fields.Str(dump_only=True)
    title = fields.Str()
    description = fields.Str()
    audience = fields.Str()
    rating = fields.Decimal(as_string=True)
    imageUrl = fields.Method("get_image_url", data_key="imageUrl")
    trailerUrl = fields.Str(attribute="trailer_url", data_key="trailerUrl")
    status = fields.Str()
    announcement = fields.Str()
    isFeatured = fields.Boolean(attribute="is_featured", data_key="isFeatured")
    genres = fields.Nested(GenreSchema, many=True)
    seasons = fields.Nested(SeasonSchema, many=True, dump_only=True)
    comments = fields.Nested(CommentSchema, many=True, dump_only=True)
    
    def get_image_url(self, obj):
        # Data URIs and external URLs are returned as is
        if obj.image_url and (obj.image_url.startswith('data:') or obj.image_url.startswith('http')):
            return obj.image_url
        # For legacy file paths, make them absolute
        return make_url_absolute(obj.image_url) if obj.image_url else None

class SupportTicketSchema(ma.Schema):
    id = fields.Int(dump_only=True)
    user_email = fields.Str()
    subject = fields.Str()
    message = fields.Str()
    timestamp = fields.DateTime(format='iso', dump_only=True)
    status = fields.Str()
    user_id = fields.Str()
    ticket_type = fields.Str()
    user = fields.Nested(UserSchema(only=("id", "name", "username")), dump_only=True)

class AllySchema(ma.Schema):
    id = fields.Str(dump_only=True)
    name = fields.Str()
    imageUrl = fields.Method("get_image_url", dump_only=True, data_key="imageUrl")
    description = fields.Str()
    mainUrl = fields.Str(attribute="main_url", data_key="mainUrl")
    socialMedia = fields.Dict(keys=fields.Str(), values=fields.Str(), attribute="social_media", data_key="socialMedia")
    isFeatured = fields.Bool(attribute="is_featured", data_key="isFeatured")

    def get_image_url(self, obj):
        if obj.image_url and obj.image_url.startswith('data:'):
            return obj.image_url
        return make_url_absolute(obj.image_url) if obj.image_url else None

class DeveloperSchema(ma.Schema):
    id = fields.Str(dump_only=True)
    name = fields.Str()
    role = fields.Str()
    imageUrl = fields.Method("get_image_url", dump_only=True, data_key="imageUrl")
    socialMedia = fields.Dict(keys=fields.Str(), values=fields.Str(), attribute="social_media", data_key="socialMedia")

    def get_image_url(self, obj):
        if obj.image_url and obj.image_url.startswith('data:'):
            return obj.image_url
        return make_url_absolute(obj.image_url) if obj.image_url else None


user_schema = UserSchema()
users_schema = UserSchema(many=True)
public_user_schema = PublicUserSchema()
anime_schema = AnimeSchema()
animes_schema = AnimeSchema(many=True)
genre_schema = GenreSchema(many=True)
comment_schema = CommentSchema()
episode_comment_schema = EpisodeCommentSchema()
episode_comments_schema = EpisodeCommentSchema(many=True)
staff_chat_message_schema = StaffChatMessageSchema()
staff_chat_messages_schema = StaffChatMessageSchema(many=True)
episode_schema = EpisodeSchema()
season_schema = SeasonSchema()
support_ticket_schema = SupportTicketSchema()
support_tickets_schema = SupportTicketSchema(many=True)
ally_schema = AllySchema()
allies_schema = AllySchema(many=True)
developer_schema = DeveloperSchema()
developers_schema = DeveloperSchema(many=True)

# --- 5. Auth & Helpers ---
def generate_token(user_id, role):
    payload = {'sub': user_id, 'role': role, 'exp': datetime.now(timezone.utc) + app.config['JWT_ACCESS_TOKEN_EXPIRES']}
    return jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm="HS256")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        if not token:
            return jsonify({"message": "Token es requerido"}), 401
        try:
            payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
            user_id = payload['sub']
            current_user = db_session.get(User, user_id)
            if not current_user:
                return jsonify({"message": "Usuario no encontrado"}), 401
            kwargs['current_user'] = current_user
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return jsonify({"message": "Token inválido o expirado"}), 401
        return f(*args, **kwargs)
    return decorated

def admin_token_required(f):
    @wraps(f)
    @token_required
    def decorated(current_user, *args, **kwargs):
        if current_user.role not in ['admin', 'co-owner', 'owner']:
            return jsonify({"message": "Permiso de administrador requerido"}), 403
        kwargs['current_user'] = current_user
        return f(*args, **kwargs)
    return decorated

def owner_co_owner_token_required(f):
    @wraps(f)
    @token_required
    def decorated(current_user, *args, **kwargs):
        if current_user.role not in ['owner', 'co-owner']:
            return jsonify({"message": "Permiso de propietario requerido"}), 403
        kwargs['current_user'] = current_user
        return f(*args, **kwargs)
    return decorated

# --- 6. API Routes ---
@app.route('/')
def health_check():
    return jsonify({"status": "ok", "message": "AnimeVerse backend is healthy."}), 200

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/uploads/avatars/<path:filename>')
def serve_avatar_upload(filename):
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], 'avatars'), filename)

@app.route('/uploads/chat/<path:filename>')
def serve_chat_upload(filename):
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], 'chat'), filename)

@app.route('/uploads/comments/<path:filename>')
def serve_comment_upload(filename):
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], 'comments'), filename)

@app.route('/uploads/animes/<path:filename>')
def serve_anime_upload(filename):
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], 'animes'), filename)
    
@app.route('/uploads/allies/<path:filename>')
def serve_ally_upload(filename):
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], 'allies'), filename)

@app.route('/uploads/developers/<path:filename>')
def serve_developer_upload(filename):
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], 'developers'), filename)


# AUTH
@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    email, password = data.get('email'), data.get('password')
    user = db_session.query(User).filter_by(email=email).first()
    if not user or not pwd_context.verify(password, user.password_hash):
        return jsonify({"message": "Credenciales inválidas"}), 401
    if user.status == 'disabled':
        return jsonify({"message": "account-disabled"}), 403
    return jsonify({"token": generate_token(user.id, user.role), "user": user_schema.dump(user)})

def create_username(name):
    base_username = re.sub(r'\s+', '', name).lower()
    base_username = re.sub(r'[^a-z0-9]', '', base_username)
    
    temp_username = base_username
    suffix = 1
    while db_session.query(User).filter_by(username=temp_username).first():
        temp_username = f"{base_username}{suffix}"
        suffix += 1
    return temp_username


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    if db_session.query(User).filter_by(email=data['email']).first():
        return jsonify({"message": "El correo ya está registrado"}), 400
    
    is_first_user = db_session.query(User).count() == 0
    role = "owner" if is_first_user else "user"

    new_user = User(
        name=data['name'], 
        username=create_username(data['name']),
        email=data['email'], 
        password_hash=pwd_context.hash(data['password']),
        role=role
    )
    try:
        db_session.add(new_user)
        db_session.commit()
        return jsonify(user_schema.dump(new_user)), 201
    except Exception as e:
        db_session.rollback()
        app.logger.error(f"Error creating user: {e}")
        return jsonify({"message": "Error interno al registrar el usuario."}), 500

@app.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    email = request.json.get('email')
    user = db_session.query(User).filter_by(email=email).first()
    if not user:
        return jsonify({"message": "Si existe una cuenta con este correo, se ha enviado un enlace para restablecer la contraseña."})
    
    token = str(uuid4())
    user.reset_password_token = token
    user.reset_password_expiration = datetime.now(timezone.utc) + timedelta(hours=1)
    db_session.commit()

    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    
    if not RESEND_API_KEY:
        app.logger.warning("RESEND_API_KEY not set. Logging password reset link to console.")
        print("--- PASSWORD RESET (EMAIL-機能が無効です) ---")
        print(f"To: {email}")
        print(f"Link: {reset_link}")
        print("------------------------------------------")
        return jsonify({"message": "La funcionalidad de correo no está configurada. Contacta al administrador."})

    html_body = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restablecer Contraseña - AnimeVerse</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #121212; color: #E0E0E0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; background-color: #1E1E1E; border-radius: 8px; overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td align="center" style="background-color: #4B0082; padding: 20px 0;">
                                <h1 style="color: #FFFFFF; font-size: 28px; margin: 0; font-weight: bold;">AnimeVerse</h1>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="color: #FFFFFF; font-size: 22px; margin-top: 0;">Restablecer tu Contraseña</h2>
                                <p style="color: #FFFFFF; font-size: 16px; line-height: 1.5;">Hola, {user.name},</p>
                                <p style="color: #FFFFFF; font-size: 16px; line-height: 1.5;">Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para elegir una nueva.</p>
                                <table border="0" cellspacing="0" cellpadding="0" width="100%">
                                    <tr>
                                        <td align="center" style="padding: 20px 0;">
                                            <a href="{reset_link}" target="_blank" style="background-color: #BF40BF; color: #FFFFFF; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">Restablecer Contraseña</a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="color: #FFFFFF; font-size: 16px; line-height: 1.5;">Si no solicitaste un cambio de contraseña, puedes ignorar este correo electrónico de forma segura.</p>
                                <p style="color: #FFFFFF; font-size: 16px; line-height: 1.5;">¡Gracias!</p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td align="center" style="padding: 20px 30px; background-color: #252525;">
                                <p style="color: #888888; font-size: 12px; margin: 0;">&copy; {datetime.now().year} AnimeVerse. Todos los derechos reservados.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    # For Resend's free tier, the "from" address must be 'onboarding@resend.dev'
    from_email_address = 'onboarding@resend.dev'

    params = {
        "from": from_email_address,
        "to": [email],
        "subject": "[AnimeVerse] Solicitud de Restablecimiento de Contraseña",
        "html": html_body
    }

    try:
        email_response = resend.Emails.send(params)
        if 'id' not in email_response:
             app.logger.error(f"Resend error: {email_response}")
             raise Exception(f"Resend error: {email_response}")
    except Exception as e:
        app.logger.error(f"Error sending email via Resend: {e}")
        # Fallback to console logging if email fails
        print("--- PASSWORD RESET (EMAIL FAILED, LOGGING TO CONSOLE) ---")
        print(f"To: {email}")
        print(f"Link: {reset_link}")
        print("--------------------")
        return jsonify({"message": "Si existe una cuenta con este correo, se ha enviado un enlace para restablecer la contraseña."})


    return jsonify({"message": "Si existe una cuenta con este correo, se ha enviado un enlace para restablecer la contraseña."})


@app.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    token = request.json.get('token')
    new_password = request.json.get('password')
    
    user = db_session.query(User).filter_by(reset_password_token=token).first()
    
    if not user or user.reset_password_expiration < datetime.now(timezone.utc):
        return jsonify({"message": "El token es inválido o ha expirado."}), 400
        
    user.password_hash = pwd_context.hash(new_password)
    user.reset_password_token = None
    user.reset_password_expiration = None
    db_session.commit()
    
    return jsonify({"message": "Contraseña actualizada con éxito."})


# USERS
@app.route("/api/users/me", methods=["GET"])
@token_required
def get_me(current_user):
    return jsonify(user_schema.dump(current_user))

@app.route("/api/users/me", methods=["PATCH"])
@token_required
def update_me(current_user):
    data = request.get_json()
    if 'name' in data:
        current_user.name = data['name']
    if 'bio' in data:
        current_user.bio = data['bio']
    if 'showActivity' in data:
        current_user.show_activity = data['showActivity']
    
    try:
        db_session.commit()
        return jsonify(user_schema.dump(current_user))
    except Exception as e:
        db_session.rollback()
        app.logger.error(f"Error updating user profile: {e}")
        return jsonify({"message": "Error interno al actualizar el perfil"}), 500

@app.route("/api/profiles/<string:username>", methods=["GET"])
def get_user_profile(username):
    user = db_session.query(User).filter_by(username=username).first()
    if not user or user.status == 'disabled':
        return jsonify({"message": "Usuario no encontrado"}), 404
    return jsonify(public_user_schema.dump(user))


@app.route("/api/users", methods=["GET"])
@admin_token_required
def get_users(current_user):
    search = request.args.get('q', '')
    query = db_session.query(User)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.name.ilike(search_term)) | (User.email.ilike(search_term))
        )
    
    users = query.order_by(User.name).all()
    return jsonify(users_schema.dump(users))

@app.route("/api/users/<string:user_id>/role", methods=["PATCH"])
@owner_co_owner_token_required
def update_user_role(user_id, current_user):
    user_to_update = db_session.get(User, user_id)
    if not user_to_update:
        return jsonify({"message": "Usuario no encontrado"}), 404
    
    if user_to_update.role == 'owner':
        return jsonify({"message": "No se puede cambiar el rol del propietario"}), 403

    data = request.get_json()
    new_role = data.get('role')
    if new_role not in ['admin', 'user', 'co-owner']:
        return jsonify({"message": "Rol inválido"}), 400

    if new_role == 'co-owner' and current_user.role != 'owner':
        return jsonify({"message": "Solo el propietario puede nombrar co-propietarios"}), 403

    user_to_update.role = new_role
    try:
        db_session.commit()
        return jsonify(user_schema.dump(user_to_update))
    except Exception as e:
        db_session.rollback()
        return jsonify({"message": "Error interno al actualizar rol"}), 500

@app.route("/api/users/<string:user_id>/status", methods=["PATCH"])
@owner_co_owner_token_required
def update_user_status(user_id, current_user):
    user_to_update = db_session.get(User, user_id)
    if not user_to_update:
        return jsonify({"message": "Usuario no encontrado"}), 404
    if user_to_update.role == 'owner':
        return jsonify({"message": "No se puede cambiar el estado del propietario"}), 403

    data = request.get_json()
    new_status = data.get('status')
    if new_status not in ['active', 'disabled']:
        return jsonify({"message": "Estado inválido"}), 400

    user_to_update.status = new_status
    try:
        db_session.commit()
        return jsonify(user_schema.dump(user_to_update))
    except Exception as e:
        db_session.rollback()
        return jsonify({"message": "Error interno al cambiar estado"}), 500


@app.route("/api/users/<string:user_id>", methods=["DELETE"])
@owner_co_owner_token_required
def delete_user(user_id, current_user):
    user_to_delete = db_session.get(User, user_id)
    if not user_to_delete:
        return jsonify({"message": "Usuario no encontrado"}), 404
    if user_to_delete.id == current_user.id:
        return jsonify({"message": "No puedes eliminar tu propia cuenta"}), 403
    if user_to_delete.role == 'owner':
        return jsonify({"message": "No se puede eliminar al propietario"}), 403
    
    try:
        db_session.delete(user_to_delete)
        db_session.commit()
        return '', 204
    except Exception as e:
        db_session.rollback()
        return jsonify({"message": "Error interno al eliminar usuario"}), 500


@app.route("/api/users/me/avatar", methods=['POST'])
@token_required
def upload_avatar(current_user):
    data = request.form
    if 'avatarBase64' not in data:
        return jsonify({"message": "No se encontró la imagen"}), 400
    
    current_user.avatar_url = data['avatarBase64']
    try:
        db_session.commit()
        # Return the new URL (which could be the same data URI)
        # using the same schema method to ensure consistency
        user_dump = user_schema.dump(current_user)
        return jsonify({"avatarUrl": user_dump['avatarUrl']})
    except Exception as e:
        db_session.rollback()
        app.logger.error(f"Error updating avatar: {e}")
        return jsonify({"message": "Error interno al actualizar el avatar"}), 500


# --- File Upload Helper ---
def save_file(file, subfolder=''):
    if not file:
        return None, None
    
    filename = secure_filename(file.filename)
    unique_filename = f"{uuid4()}_{filename}"
    
    upload_path = os.path.join(app.config['UPLOAD_FOLDER'], subfolder)
    os.makedirs(upload_path, exist_ok=True)
    
    file_path = os.path.join(upload_path, unique_filename)
    file.save(file_path)
    
    # Always use forward slashes for the URL path
    url_path = os.path.join('uploads', subfolder, unique_filename).replace('\\', '/')
    return f"/{url_path}", unique_filename

# GENRES
@app.route("/api/genres", methods=["GET"])
def get_genres():
    genres = db_session.query(Genre).order_by(Genre.name).all()
    return jsonify(genre_schema.dump(genres))

# ANIMES
@app.route("/api/animes", methods=["GET"])
def get_animes():
    query = db_session.query(Anime)

    # Filtering
    search = request.args.get('q')
    genre = request.args.get('genre')
    status = request.args.get('status')
    min_rating = request.args.get('min_rating', type=float)
    is_featured_str = request.args.get('isFeatured')

    if search:
        search_term = f"%{search}%"
        # Prioritize results that start with the search term
        query = query.order_by(func.lower(Anime.title).like(f"{search.lower()}%").desc())
        query = query.filter(Anime.title.ilike(search_term))
    if genre:
        query = query.join(Anime.genres).filter(Genre.name == genre)
    if status:
        query = query.filter(Anime.status == status)
    if min_rating:
        query = query.filter(Anime.rating >= min_rating)
    if is_featured_str is not None:
        is_featured = is_featured_str.lower() in ['true', '1', 't']
        query = query.filter(Anime.is_featured == is_featured)


    # Sorting
    sort_by = request.args.get('sort_by', 'rating_desc')
    if sort_by == 'rating_desc' and not search: # Only sort by rating if not searching
        query = query.order_by(Anime.rating.desc())
    elif sort_by == 'title_asc' and not search:
        query = query.order_by(Anime.title.asc())
    
    animes = query.all()
    return jsonify(animes_schema.dump(animes))

@app.route("/api/animes/home-sections", methods=["GET"])
def get_home_sections():
    # Get 5 most popular genres (by number of animes)
    popular_genres_query = db_session.query(
        Genre.name, func.count(anime_genres_table.c.anime_id).label('anime_count')
    ).join(anime_genres_table, Genre.id == anime_genres_table.c.genre_id).group_by(Genre.id).order_by(func.count(anime_genres_table.c.anime_id).desc()).limit(5)
    
    popular_genres = [row[0] for row in popular_genres_query.all()]

    sections = {}
    for genre_name in popular_genres:
        animes = db_session.query(Anime).join(Anime.genres).filter(Genre.name == genre_name).filter(Anime.rating >= 3.5).order_by(Anime.rating.desc()).limit(10).all()
        if animes:
            sections[genre_name] = animes_schema.dump(animes)

    return jsonify(sections)


@app.route("/api/animes", methods=["POST"])
@admin_token_required
def add_anime(current_user):
    data = request.form
    if not data or not data.get('title') or not data.get('description'):
        return jsonify({"message": "Title and description are required"}), 400
    
    new_anime = Anime(
        title=data.get('title'),
        description=data.get('description'),
        audience=data.get('audience'),
        rating=data.get('rating'),
        trailer_url=data.get('trailerUrl'),
        status=data.get('status'),
        announcement=data.get('announcement'),
        is_featured=data.get('isFeatured', 'false').lower() in ['true', '1', 't']
    )

    if 'imageBase64' in data and data['imageBase64']:
        new_anime.image_url = data['imageBase64']
    elif 'imageUrl' in data:
        new_anime.image_url = data['imageUrl']


    db_session.add(new_anime)

    try:
        # Handle genres
        genre_names_str = data.get('genre', '')
        genre_names = [name.strip() for name in genre_names_str.split(',') if name.strip()]
        for name in genre_names:
            genre = db_session.query(Genre).filter_by(name=name).first()
            if not genre:
                genre = Genre(name=name)
                db_session.add(genre)
            new_anime.genres.append(genre)

        db_session.commit()
        return jsonify(anime_schema.dump(new_anime)), 201
    except Exception as e:
        db_session.rollback()
        app.logger.error(f"Error adding anime: {e}")
        return jsonify({"message": "Error interno al añadir anime"}), 500


@app.route("/api/animes/<string:anime_id>", methods=["GET"])
def get_anime(anime_id):
    anime = db_session.get(Anime, anime_id)
    if not anime:
        return jsonify({"message": "Anime no encontrado"}), 404

    # Order episodes numerically
    for season in anime.seasons:
        season.episodes.sort(key=lambda e: int(re.search(r'(\d+)', e.title).group(1)) if re.search(r'(\d+)', e.title) else 0)

    return jsonify(anime_schema.dump(anime))

@app.route("/api/animes/<string:anime_id>", methods=["PATCH"])
@admin_token_required
def update_anime(anime_id, current_user):
    anime = db_session.get(Anime, anime_id)
    if not anime:
        return jsonify({"message": "Anime no encontrado"}), 404
    
    data = request.form

    if 'title' in data: anime.title = data['title']
    if 'description' in data: anime.description = data['description']
    if 'audience' in data: anime.audience = data['audience']
    if 'rating' in data: anime.rating = data['rating']
    if 'status' in data: anime.status = data['status']
    if 'announcement' in data: anime.announcement = data['announcement']
    if 'trailerUrl' in data: anime.trailer_url = data['trailerUrl']
    
    if 'isFeatured' in data:
        anime.is_featured = data['isFeatured'].lower() in ['true', '1', 't']

    if 'imageBase64' in data and data['imageBase64']:
        anime.image_url = data['imageBase64']
    elif 'imageUrl' in data:
        # Avoid overwriting with blob urls from preview
        if not data['imageUrl'].startswith('blob:'):
            anime.image_url = data['imageUrl']

    if 'genre' in data:
        anime.genres.clear()
        genre_names = data['genre'].split(',')
        for name in genre_names:
            if name:
                genre = db_session.query(Genre).filter_by(name=name.strip()).first()
                if not genre:
                    genre = Genre(name=name.strip())
                    db_session.add(genre)
                anime.genres.append(genre)

    try:
        db_session.commit()
        updated_anime = db_session.get(Anime, anime_id)
        return jsonify(anime_schema.dump(updated_anime))
    except Exception as e:
        db_session.rollback()
        app.logger.error(f"Error updating anime {anime_id}: {e}")
        return jsonify({"message": "Error interno al actualizar anime"}), 500


@app.route("/api/animes/<string:anime_id>", methods=["DELETE"])
@admin_token_required
def delete_anime(anime_id, current_user):
    anime = db_session.get(Anime, anime_id)
    if not anime:
        return jsonify({"message": "Anime no encontrado"}), 404
    
    try:
        db_session.delete(anime)
        db_session.commit()
        return '', 204
    except Exception as e:
        db_session.rollback()
        app.logger.error(f"Error deleting anime: {e}")
        return jsonify({"message": "Error interno al eliminar anime"}), 500
    
# SEASONS
@app.route("/api/animes/<string:anime_id>/seasons", methods=["POST"])
@admin_token_required
def add_season(anime_id, current_user):
    anime = db_session.get(Anime, anime_id)
    if not anime:
        return jsonify({"message": "Anime no encontrado"}), 404
    
    data = request.get_json()
    if not data or 'title' not in data or not data['title'].strip():
        return jsonify({"message": "El título de la temporada es requerido"}), 400
    
    try:
        new_season = Season(
            title=data['title'],
            anime_id=anime_id
        )
        db_session.add(new_season)
        db_session.commit()
        return jsonify(season_schema.dump(new_season)), 201
    except Exception as e:
        db_session.rollback()
        app.logger.error(f"Error adding season: {e}")
        return jsonify({"message": "Error interno al añadir temporada"}), 500

def extract_iframe_src(iframe_code):
    """Extrae la URL del atributo src de una etiqueta iframe."""
    if not iframe_code or not iframe_code.strip().startswith('<iframe'):
        return iframe_code # It's likely a direct URL
    
    src_match = re.search(r'src="([^"]+)"', iframe_code)
    if src_match:
        return src_match.group(1)
    
    # Fallback for single quotes
    src_match_single = re.search(r"src='([^']+)'", iframe_code)
    if src_match_single:
        return src_match_single.group(1)
        
    return iframe_code # Return original if no src found

# EPISODES
@app.route("/api/animes/<string:anime_id>/seasons/<string:season_id>/episodes", methods=["POST"])
@admin_token_required
def add_episode(anime_id, season_id, current_user):
    season = db_session.get(Season, season_id)
    if not season or season.anime_id != anime_id:
        return jsonify({"message": "Temporada no encontrada"}), 404

    data = request.get_json()
    if not data or not data.get('title') or not data.get('duration'):
        return jsonify({"message": "Título y duración son requeridos"}), 400

    try:
        new_episode = Episode(
            title=data['title'],
            duration=data['duration'],
            synopsis=data.get('synopsis'),
            season_id=season_id
        )
        db_session.add(new_episode)

        db_session.flush()

        for source_data in data.get('sources', []):
            url_value = source_data.get('url', '')
            source_type = source_data.get('type', 'url')
            if source_type == 'iframe':
                url_value = extract_iframe_src(url_value)
            
            new_source = EpisodeSource(
                server=source_data['server'],
                url=url_value,
                language=source_data['language'],
                type=source_type,
                episode_id=new_episode.id
            )
            db_session.add(new_source)

        db_session.commit()
        return jsonify(episode_schema.dump(new_episode)), 201
    except Exception as e:
        db_session.rollback()
        app.logger.error(f"Error adding episode: {e}")
        return jsonify({"message": "Error interno al añadir episodio"}), 500


@app.route("/api/animes/<string:anime_id>/seasons/<string:season_id>/episodes/<string:episode_id>", methods=["DELETE"])
@admin_token_required
def delete_episode(anime_id, season_id, episode_id, current_user):
    episode = db_session.query(Episode).filter_by(id=episode_id, season_id=season_id).first()
    if not episode:
        return jsonify({"message": "Episodio no encontrado"}), 404
    try:
        db_session.delete(episode)
        db_session.commit()
        return jsonify({}), 204
    except Exception as e:
        db_session.rollback()
        return jsonify({"message": "Error interno al eliminar episodio"}), 500

@app.route("/api/animes/<string:anime_id>/seasons/<string:season_id>/episodes/<string:episode_id>", methods=["PATCH"])
@admin_token_required
def update_episode(anime_id, season_id, episode_id, current_user):
    episode = db_session.query(Episode).filter_by(id=episode_id, season_id=season_id).first()
    if not episode:
        return jsonify({"message": "Episodio no encontrado"}), 404
    
    data = request.get_json()
    
    try:
        if 'title' in data:
            episode.title = data['title']
        if 'duration' in data:
            episode.duration = data['duration']
        if 'synopsis' in data:
            episode.synopsis = data['synopsis']
        
        if 'sources' in data:
            for source in episode.sources:
                db_session.delete(source)
            
            for source_data in data['sources']:
                url_value = source_data.get('url', '')
                source_type = source_data.get('type', 'url')
                if source_type == 'iframe':
                    url_value = extract_iframe_src(url_value)
                
                new_source = EpisodeSource(
                    server=source_data['server'],
                    url=url_value,
                    language=source_data['language'],
                    type=source_type,
                    episode_id=episode.id
                )
                db_session.add(new_source)

        db_session.commit()
        return jsonify(episode_schema.dump(episode))
    except Exception as e:
        db_session.rollback()
        app.logger.error(f"Error updating episode: {e}")
        return jsonify({"message": "Error interno al actualizar el episodio"}), 500

# COMMENTS
@app.route("/api/animes/<string:anime_id>/comments", methods=["POST"])
@token_required
def post_comment(anime_id, current_user):
    if not db_session.get(Anime, anime_id):
        return jsonify({"message": "Anime no encontrado"}), 404

    data = request.get_json()
    text = data.get('text')
    parent_id = data.get('parentId')
    media_base64 = data.get('mediaBase64')

    if not text and not media_base64:
        return jsonify({"message": "El comentario no puede estar vacío"}), 400

    new_comment = Comment(
        text=text,
        user_id=current_user.id,
        anime_id=anime_id,
        parent_id=parent_id if parent_id else None
    )

    if media_base64:
        new_comment.media_url = media_base64

    try:
        db_session.add(new_comment)
        db_session.commit()
        comment_with_details = db_session.query(Comment).options(
            joinedload(Comment.author),
            joinedload(Comment.parent).joinedload(Comment.author),
            joinedload(Comment.replies)
        ).filter_by(id=new_comment.id).one()
        return jsonify(comment_schema.dump(comment_with_details)), 201
    except Exception as e:
        db_session.rollback()
        app.logger.error(f"Error posting comment: {e}")
        return jsonify({"message": "Error interno al publicar comentario"}), 500

@app.route("/api/animes/<string:anime_id>/comments/<string:comment_id>", methods=["PATCH"])
@token_required
def update_comment_route(anime_id, comment_id, current_user):
    comment = db_session.query(Comment).filter_by(id=comment_id, anime_id=anime_id).first()
    if not comment:
        return jsonify({"message": "Comentario no encontrado"}), 404

    # Permission check: user can edit their own comment, or an admin can edit any
    is_admin = current_user.role in ['admin', 'co-owner', 'owner']
    if comment.user_id != current_user.id and not is_admin:
        return jsonify({"message": "No tienes permiso para editar este comentario"}), 403

    data = request.get_json()
    if 'text' in data:
        comment.text = data['text']

    try:
        db_session.commit()
        return jsonify(comment_schema.dump(comment))
    except Exception as e:
        db_session.rollback()
        return jsonify({"message": "Error interno al actualizar el comentario"}), 500

@app.route("/api/animes/<string:anime_id>/comments/<string:comment_id>", methods=["DELETE"])
@token_required
def delete_comment_route(anime_id, comment_id, current_user):
    comment = db_session.query(Comment).filter_by(id=comment_id, anime_id=anime_id).first()
    if not comment:
        return jsonify({"message": "Comentario no encontrado"}), 404

    is_admin = current_user.role in ['admin', 'co-owner', 'owner']
    if comment.user_id != current_user.id and not is_admin:
        return jsonify({"message": "No tienes permiso para eliminar este comentario"}), 403

    try:
        # If comment has replies, mark as deleted instead of removing
        if db_session.query(Comment).filter_by(parent_id=comment_id).first():
            comment.is_deleted = True
            comment.text = "[deleted]"
            comment.media_url = None
        else:
            db_session.delete(comment)
        
        db_session.commit()
        return '', 204
    except Exception as e:
        db_session.rollback()
        return jsonify({"message": "Error interno al eliminar el comentario"}), 500

# EPISODE COMMENTS
@app.route("/api/episodes/<string:episode_id>/comments", methods=["POST"])
@token_required
def post_episode_comment(episode_id, current_user):
    if not db_session.get(Episode, episode_id):
        return jsonify({"message": "Episodio no encontrado"}), 404

    data = request.get_json()
    text = data.get('text')
    parent_id = data.get('parentId')
    media_base64 = data.get('mediaBase64')

    if not text and not media_base64:
        return jsonify({"message": "El comentario no puede estar vacío"}), 400

    new_comment = EpisodeComment(
        text=text,
        user_id=current_user.id,
        episode_id=episode_id,
        parent_id=parent_id if parent_id else None
    )

    if media_base64:
        new_comment.media_url = media_base64

    try:
        db_session.add(new_comment)
        db_session.commit()
        comment_with_details = db_session.query(EpisodeComment).options(
            joinedload(EpisodeComment.author),
            joinedload(EpisodeComment.parent).joinedload(EpisodeComment.author),
            joinedload(EpisodeComment.replies)
        ).filter_by(id=new_comment.id).one()
        return jsonify(episode_comment_schema.dump(comment_with_details)), 201
    except Exception as e:
        db_session.rollback()
        app.logger.error(f"Error posting episode comment: {e}")
        return jsonify({"message": "Error interno al publicar comentario"}), 500
        

@app.route("/api/episodes/<string:episode_id>/comments", methods=["GET"])
@token_required
def get_episode_comments(episode_id, current_user):
    comments = db_session.query(EpisodeComment).filter_by(episode_id=episode_id).order_by(EpisodeComment.timestamp.desc()).all()
    return jsonify(episode_comments_schema.dump(comments))

@app.route("/api/episodes/<string:episode_id>/comments/<string:comment_id>", methods=["PATCH"])
@token_required
def update_episode_comment(episode_id, comment_id, current_user):
    comment = db_session.query(EpisodeComment).filter_by(id=comment_id, episode_id=episode_id).first()
    if not comment:
        return jsonify({"message": "Comentario no encontrado"}), 404

    is_admin = current_user.role in ['admin', 'co-owner', 'owner']
    if comment.user_id != current_user.id and not is_admin:
        return jsonify({"message": "No tienes permiso para editar este comentario"}), 403

    data = request.get_json()
    if 'text' in data:
        comment.text = data['text']

    try:
        db_session.commit()
        return jsonify(episode_comment_schema.dump(comment))
    except Exception as e:
        db_session.rollback()
        return jsonify({"message": "Error interno al actualizar el comentario"}), 500

@app.route("/api/episodes/<string:episode_id>/comments/<string:comment_id>", methods=["DELETE"])
@token_required
def delete_episode_comment(episode_id, comment_id, current_user):
    comment = db_session.query(EpisodeComment).filter_by(id=comment_id, episode_id=episode_id).first()
    if not comment:
        return jsonify({"message": "Comentario no encontrado"}), 404

    is_admin = current_user.role in ['admin', 'co-owner', 'owner']
    if comment.user_id != current_user.id and not is_admin:
        return jsonify({"message": "No tienes permiso para eliminar este comentario"}), 403

    try:
        if db_session.query(EpisodeComment).filter_by(parent_id=comment_id).first():
            comment.is_deleted = True
            comment.text = "[deleted]"
            comment.media_url = None
        else:
            db_session.delete(comment)
        
        db_session.commit()
        return '', 204
    except Exception as e:
        db_session.rollback()
        return jsonify({"message": "Error interno al eliminar el comentario"}), 500


# STAFF CHAT
@app.route("/api/staff-chat", methods=["GET"])
@admin_token_required
def get_staff_chat_messages(current_user):
    messages = db_session.query(StaffChatMessage).options(
        joinedload(StaffChatMessage.author),
        joinedload(StaffChatMessage.parent).joinedload(StaffChatMessage.author)
    ).order_by(StaffChatMessage.timestamp.asc()).all()
    return jsonify(staff_chat_messages_schema.dump(messages))

@app.route("/api/staff-chat", methods=["POST"])
@admin_token_required
def post_staff_chat_message(current_user):
    data = request.get_json()
    text = data.get('text')
    parent_id = data.get('parentId')
    media_base64 = data.get('mediaBase64')
    
    new_message = StaffChatMessage(
        user_id=current_user.id,
        parent_id=parent_id if parent_id else None
    )

    if text:
        new_message.text = text
    
    if media_base64:
        new_message.media_url = media_base64
    
    if not new_message.text and not new_message.media_url:
        return jsonify({"message": "El mensaje no puede estar vacío"}), 400

    try:
        db_session.add(new_message)
        db_session.commit()
        
        message_with_author = db_session.query(StaffChatMessage).options(
            joinedload(StaffChatMessage.author),
            joinedload(StaffChatMessage.parent).joinedload(StaffChatMessage.author)
        ).filter_by(id=new_message.id).one()

        return jsonify(staff_chat_message_schema.dump(message_with_author)), 201
    except Exception as e:
        db_session.rollback()
        app.logger.error(f"Error posting staff chat message: {e}")
        return jsonify({"message": "Error interno al enviar el mensaje"}), 500

@app.route("/api/staff-chat/<string:message_id>", methods=["PATCH"])
@admin_token_required
def update_staff_chat_message(message_id, current_user):
    message = db_session.get(StaffChatMessage, message_id)
    if not message:
        return jsonify({"message": "Mensaje no encontrado"}), 404

    if message.user_id != current_user.id:
        return jsonify({"message": "No tienes permiso para editar este mensaje"}), 403

    data = request.get_json()
    if 'text' in data:
        message.text = data['text']
    
    try:
        db_session.commit()
        return jsonify(staff_chat_message_schema.dump(message))
    except Exception as e:
        db_session.rollback()
        return jsonify({"message": "Error interno al actualizar mensaje"}), 500

@app.route("/api/staff-chat/<string:message_id>", methods=["DELETE"])
@admin_token_required
def delete_staff_chat_message(message_id, current_user):
    message = db_session.get(StaffChatMessage, message_id)
    if not message:
        return jsonify({"message": "Mensaje no encontrado"}), 404
    
    if message.user_id != current_user.id:
        return jsonify({"message": "No tienes permiso para eliminar este mensaje"}), 403

    try:
        # If message has replies, mark as deleted
        if db_session.query(StaffChatMessage).filter_by(parent_id=message_id).first():
            message.is_deleted = True
            message.text = "[deleted]"
            message.media_url = None
        else:
            db_session.delete(message)

        db_session.commit()
        return '', 204
    except Exception as e:
        db_session.rollback()
        return jsonify({"message": "Error interno al eliminar el mensaje"}), 500


# --- SUPPORT ---
@app.route("/api/support/disabled-account", methods=["POST"])
def disabled_account_support():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('message'):
        return jsonify({"message": "Email y mensaje son requeridos."}), 400
    
    user = db_session.query(User).filter_by(email=data['email']).first()
    
    ticket = SupportTicket(
        user_email=data['email'],
        subject="Disabled Account Inquiry",
        message=data['message'],
        ticket_type='disabled-account'
    )
    if user:
        ticket.user_id = user.id

    db_session.add(ticket)
    db_session.commit()
    
    return jsonify({"message": "Tu mensaje ha sido enviado. El equipo de administración se pondrá en contacto contigo pronto."}), 201

@app.route("/api/support/ticket", methods=["POST"])
@token_required
def create_support_ticket(current_user):
    data = request.get_json()
    if not data or not data.get('subject') or not data.get('message') or not data.get('ticketType'):
        return jsonify({"message": "Subject, message, and ticket type are required."}), 400
    
    ticket = SupportTicket(
        user_email=current_user.email,
        user_id=current_user.id,
        subject=data['subject'],
        message=data['message'],
        ticket_type=data['ticketType']
    )
    db_session.add(ticket)
    db_session.commit()
    
    return jsonify({"message": "Tu ticket ha sido enviado. Nos pondremos en contacto contigo pronto."}), 201


@app.route("/api/support/tickets", methods=["GET"])
@admin_token_required
def get_support_tickets(current_user):
    tickets = db_session.query(SupportTicket).options(
        joinedload(SupportTicket.user)
    ).order_by(SupportTicket.timestamp.desc()).all()
    return jsonify(support_tickets_schema.dump(tickets))

@app.route("/api/support/tickets/<int:ticket_id>/status", methods=["PATCH"])
@admin_token_required
def update_ticket_status(ticket_id, current_user):
    ticket = db_session.get(SupportTicket, ticket_id)
    if not ticket:
        return jsonify({"message": "Ticket no encontrado"}), 404
    
    data = request.get_json()
    new_status = data.get('status')
    if new_status not in ['open', 'closed', 'in-progress']:
        return jsonify({"message": "Estado inválido"}), 400
        
    ticket.status = new_status
    db_session.commit()
    return jsonify(support_ticket_schema.dump(ticket))


# --- ALLIES ---

@app.route("/api/allies", methods=["GET"])
def get_allies():
    allies = db_session.query(Ally).order_by(Ally.is_featured.desc(), Ally.name.asc()).all()
    return jsonify(allies_schema.dump(allies))


@app.route("/api/allies", methods=["POST"])
@admin_token_required
def add_ally(current_user):
    data = request.get_json()
    
    new_ally = Ally(
        name=data.get('name'),
        description=data.get('description'),
        main_url=data.get('mainUrl'),
        is_featured=data.get('isFeatured', False)
    )

    if 'socialMedia' in data:
        new_ally.social_media = data['socialMedia']
    
    if 'imageBase64' in data and data['imageBase64']:
        new_ally.image_url = data['imageBase64']
    else:
        return jsonify({"message": "Image is required"}), 400

    try:
        db_session.add(new_ally)
        db_session.commit()
        return jsonify(ally_schema.dump(new_ally)), 201
    except Exception as e:
        db_session.rollback()
        app.logger.error(f"Error adding ally: {e}")
        return jsonify({"message": "Error interno al añadir aliado"}), 500


@app.route("/api/allies/<string:ally_id>", methods=["PATCH"])
@admin_token_required
def update_ally(ally_id, current_user):
    ally = db_session.get(Ally, ally_id)
    if not ally:
        return jsonify({"message": "Aliado no encontrado"}), 404
    
    data = request.get_json()
    
    ally.name = data.get('name', ally.name)
    ally.description = data.get('description', ally.description)
    ally.main_url = data.get('mainUrl', ally.main_url)
    ally.is_featured = data.get('isFeatured', ally.is_featured)

    if 'socialMedia' in data:
        ally.social_media = data['socialMedia']

    if 'imageBase64' in data and data['imageBase64']:
        ally.image_url = data['imageBase64']

    try:
        db_session.commit()
        return jsonify(ally_schema.dump(ally))
    except Exception as e:
        db_session.rollback()
        app.logger.error(f"Error updating ally: {e}")
        return jsonify({"message": "Error interno al actualizar aliado"}), 500


@app.route("/api/allies/<string:ally_id>", methods=["DELETE"])
@admin_token_required
def delete_ally(ally_id, current_user):
    ally = db_session.get(Ally, ally_id)
    if not ally:
        return jsonify({"message": "Aliado no encontrado"}), 404
    
    try:
        db_session.delete(ally)
        db_session.commit()
        return '', 204
    except Exception as e:
        db_session.rollback()
        return jsonify({"message": "Error interno al eliminar aliado"}), 500

# --- DEVELOPERS ---
@app.route("/api/developers", methods=["GET"])
def get_developers():
    developers = db_session.query(Developer).order_by(Developer.name.asc()).all()
    return jsonify(developers_schema.dump(developers))

@app.route("/api/developers", methods=["POST"])
@admin_token_required
def add_developer(current_user):
    data = request.get_json()
    
    new_developer = Developer(
        name=data.get('name'),
        role=data.get('role'),
    )

    if 'socialMedia' in data:
        new_developer.social_media = data['socialMedia']
    
    if 'imageBase64' in data and data['imageBase64']:
        new_developer.image_url = data['imageBase64']
    else:
        return jsonify({"message": "Image is required"}), 400

    try:
        db_session.add(new_developer)
        db_session.commit()
        return jsonify(developer_schema.dump(new_developer)), 201
    except Exception as e:
        db_session.rollback()
        app.logger.error(f"Error adding developer: {e}")
        return jsonify({"message": "Error interno al añadir desarrollador"}), 500


@app.route("/api/developers/<string:developer_id>", methods=["PATCH"])
@admin_token_required
def update_developer(developer_id, current_user):
    developer = db_session.get(Developer, developer_id)
    if not developer:
        return jsonify({"message": "Desarrollador no encontrado"}), 404
    
    data = request.get_json()
    
    developer.name = data.get('name', developer.name)
    developer.role = data.get('role', developer.role)

    if 'socialMedia' in data:
        developer.social_media = data['socialMedia']

    if 'imageBase64' in data and data['imageBase64']:
        developer.image_url = data['imageBase64']

    try:
        db_session.commit()
        return jsonify(developer_schema.dump(developer))
    except Exception as e:
        db_session.rollback()
        app.logger.error(f"Error updating developer: {e}")
        return jsonify({"message": "Error interno al actualizar desarrollador"}), 500


@app.route("/api/developers/<string:developer_id>", methods=["DELETE"])
@admin_token_required
def delete_developer(developer_id, current_user):
    developer = db_session.get(Developer, developer_id)
    if not developer:
        return jsonify({"message": "Desarrollador no encontrado"}), 404
    
    try:
        db_session.delete(developer)
        db_session.commit()
        return '', 204
    except Exception as e:
        db_session.rollback()
        return jsonify({"message": "Error interno al eliminar desarrollador"}), 500


# --- App Execution & Initialization ---
def initialize_app(app_instance):
    """A centralized place to run all initialization logic."""
    with app_instance.app_context():
        init_db_session()
        sync_database_schema()
        create_or_update_owner()
        seed_initial_data()

def create_or_update_owner():
    """Create or update the owner account from environment variables."""
    owner_email = os.environ.get('OWNER_EMAIL', 'owner@animeverse.com')
    owner_password = os.environ.get('OWNER_PASSWORD', 'owner123')
    
    owner = db_session.query(User).filter_by(email=owner_email).first()
    
    if not owner:
        print("Creating owner account...")
        owner = User(
            name='Site Owner',
            username=create_username('Site Owner'),
            email=owner_email,
            password_hash=pwd_context.hash(owner_password),
            role='owner',
            status='active'
        )
        db_session.add(owner)
    else:
        # For security, you might want to only update the password if it's different
        # For simplicity, we just re-hash and set it.
        if not pwd_context.verify(owner_password, owner.password_hash):
            owner.password_hash = pwd_context.hash(owner_password)
        owner.role = 'owner' # Ensure role is owner
    
    db_session.commit()
    print(f"Owner account ({owner_email}) is up to date.")


def seed_initial_data():
    """Seed the database with initial data like genres."""
    initial_genres = ['Aventura', 'Acción', 'Comedia', 'Drama', 'Fantasía', 'Ciencia Ficción', 'Romance', 'Misterio', 'Slice of Life', 'Deportes']
    for genre_name in initial_genres:
        if not db_session.query(Genre).filter_by(name=genre_name).first():
            db_session.add(Genre(name=genre_name))
    
    db_session.commit()
    print("Initial genres seeded.")


def sync_database_schema():
    """
    Compares models with the DB schema and adds missing columns.
    A basic migration helper.
    """
    engine = db.engine
    inspector = inspect(engine)
    
    tables = db.metadata.sorted_tables
    for table in tables:
        table_name = table.name
        if not inspector.has_table(table_name):
            print(f"Table '{table_name}' not found, creating it.")
            table.create(engine)
            continue

        db_columns = {c['name']: c for c in inspector.get_columns(table_name)}
        model_columns = {c.name: c for c in table.c}
        
        # Add missing columns
        for column_name, column in model_columns.items():
            if column_name not in db_columns:
                column_type = column.type.compile(engine.dialect)
                sql = f"ALTER TABLE `{table_name}` ADD COLUMN `{column_name}` {column_type}"
                
                # Handle NOT NULL constraints for new columns
                if column.nullable is False and not column.primary_key:
                    default_value = "''"
                    if isinstance(column.type, (db.Integer, db.Float, db.DECIMAL)):
                        default_value = "0"
                    elif isinstance(column.type, db.Boolean):
                        default_value = "FALSE"
                    sql += f" NOT NULL DEFAULT {default_value}"
                
                server_default = column.server_default
                if server_default is not None:
                     sql += f" DEFAULT {server_default.arg.text}"
                
                print(f"Adding missing column '{column_name}' to table '{table_name}'...")
                try:
                    with engine.connect() as connection:
                        connection.execute(text(sql))
                        connection.commit()
                    print(f"Column '{column_name}' added successfully.")
                except Exception as e:
                    db_session.rollback()
                    print(f"Error adding column '{column_name}': {e}")
        
        # Update column types if necessary
        for column_name, column in model_columns.items():
            if column_name in db_columns:
                model_type = column.type.compile(engine.dialect)
                db_type = db_columns[column_name]['type']
                
                # Simple type comparison, may need more sophisticated logic for complex types
                # Using __str__ for comparison as SQLAlchemy types are objects
                if str(model_type).lower() != str(db_type).lower():
                    # Check for TEXT/LONGTEXT which are often interchangeable
                    if ('text' in str(model_type).lower() and 'text' in str(db_type).lower()):
                        continue

                    print(f"Column '{column_name}' in table '{table_name}' has type mismatch. Model: {model_type}, DB: {db_type}. Attempting to modify...")
                    
                    sql_modify = f"ALTER TABLE `{table_name}` MODIFY COLUMN `{column_name}` {model_type}"
                    try:
                        with engine.connect() as connection:
                            connection.execute(text(sql_modify))
                            connection.commit()
                        print(f"Modified column '{column_name}' type successfully.")
                    except Exception as e:
                        db_session.rollback()
                        print(f"Error modifying column '{column_name}' type: {e}. Manual migration might be needed.")


# Initialize everything before running the app
initialize_app(app)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
