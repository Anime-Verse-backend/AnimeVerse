# db_shell.py
import os
import tempfile
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, exc

# --- 1. Load Environment Variables ---
load_dotenv()
print("... Loading environment variables from .env file")

DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_HOST = os.environ.get('DB_HOST')
DB_PORT = os.environ.get('DB_PORT')
DB_NAME = os.environ.get('DB_NAME')

# --- 2. Check for required variables ---
if not all([DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, DB_PORT]):
    print("\n[ERROR] Missing one or more required environment variables in your .env file:")
    print("DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME")
    exit(1)

# --- SSL Configuration Helper ---
def get_ssl_ca_path():
    """
    Determines the path to the SSL CA certificate for the shell.
    """
    ssl_ca_value = os.environ.get('DB_SSL_CA')
    if not ssl_ca_value:
        return None
    
    # Check if the value is a path to an existing file
    if os.path.exists(ssl_ca_value):
        print(f"... SSL Certificate Authority file found at '{ssl_ca_value}'.")
        return ssl_ca_value
        
    # If not a path, assume it's the cert content and write to a temp file
    if '-----BEGIN CERTIFICATE-----' in ssl_ca_value:
        try:
            with tempfile.NamedTemporaryFile(delete=False, mode='w', suffix='.pem', prefix='shell-ca-cert-') as temp_ca_file:
                temp_ca_file.write(ssl_ca_value)
                print(f"... SSL Certificate Authority content written to temporary file: {temp_ca_file.name}")
                return temp_ca_file.name
        except Exception as e:
            print(f"[ERROR] Could not create temporary CA file: {e}")
            return None
    
    print(f"... SSL Certificate Authority configured with value: {ssl_ca_value}")
    return ssl_ca_value

DB_SSL_CA = get_ssl_ca_path()

print(f"... Connecting to database '{DB_NAME}' at {DB_HOST}:{DB_PORT}")

# --- 3. Build Connection String and Engine Options ---
db_uri = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine_options = {'pool_recycle': 280}

if DB_SSL_CA:
    engine_options['connect_args'] = {'ssl_ca': DB_SSL_CA}
    print("... SSL configured.")
else:
    print("... No SSL Certificate Authority found. Connecting without SSL.")


# --- 4. Create Engine and Connect ---
try:
    engine = create_engine(db_uri, **engine_options)
    with engine.connect() as connection:
        print("\n✅ CONNECTION SUCCESSFUL!")
        print("-----------------------------------------")
        print("Welcome to the AnimeVerse DB Shell.")
        print("Type your SQL query and press Enter.")
        print("Type 'exit' or 'quit' to close the shell.")
        print("-----------------------------------------")
        
        while True:
            try:
                query_str = input(f"{DB_NAME}> ")
                if query_str.lower() in ['exit', 'quit']:
                    break
                
                if not query_str.strip():
                    continue

                query = text(query_str)
                result = connection.execute(query)
                
                if result.returns_rows:
                    rows = result.fetchall()
                    if rows:
                        # Print header
                        print("\n" + " | ".join(map(str, result.keys())))
                        print("-" * (sum(len(str(k)) for k in result.keys()) + 3 * len(result.keys())))
                        # Print rows
                        for row in rows:
                            print(" | ".join(str(item) for item in row))
                        print(f"\n({len(rows)} row(s) returned)")
                    else:
                        print("\n(0 rows returned)")
                else:
                    connection.commit()
                    print(f"\nQuery executed successfully. {result.rowcount} row(s) affected.")

            except Exception as e:
                print(f"[QUERY ERROR] {e}")

except exc.OperationalError as e:
    print("\n❌ CONNECTION FAILED: Could not connect to the database.")
    print("   Please check the following:")
    print("   1. Are your DB credentials in .env correct (HOST, PORT, USER, PASSWORD, NAME)?")
    print("   2. Is the database server running and accessible?")
    print("   3. If using SSL, is the path to your 'ca.pem' file in DB_SSL_CA correct?")
    print("   4. MOST LIKELY: Have you added your current IP address to the Aiven firewall/allowed IPs list?")
    print(f"\n   Original Error: {e}")
except Exception as e:
    print(f"\n❌ An unexpected error occurred: {e}")

finally:
    print("\n... Closing connection. Goodbye!")
