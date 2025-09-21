
export type User = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'owner' | 'co-owner' | 'admin' | 'user';
  status: 'active' | 'disabled';
  joined: string; // ISO string
  avatarUrl?: string;
  bio?: string;
  showActivity?: boolean;
};

export type Comment = {
  id: string;
  author: Partial<User>;
  text: string;
  timestamp: string; // ISO string
  mediaUrl?: string;
  parent?: Comment;
  replies?: Comment[];
  isDeleted?: boolean;
};

export type EpisodeComment = {
  id: string;
  author: Partial<User>;
  text: string;
  timestamp: string; // ISO string
  mediaUrl?: string;
  parent?: EpisodeComment;
  replies?: EpisodeComment[];
  isDeleted?: boolean;
};

export type StaffChatMessage = {
  id: string;
  author: Partial<User>;
  text: string;
  timestamp: string; // ISO string
  mediaUrl?: string;
  parent?: {
    id: string;
    text: string;
    author: {
      name: string;
    };
    isDeleted?: boolean;
  };
  replies: StaffChatMessage[];
  isDeleted?: boolean;
}

export type EpisodeSource = {
  id: string;
  server: string;
  url: string;
  language: 'Subtitled' | 'Latin Spanish' | 'Castilian' | 'English';
};

export type Episode = {
  id:string;
  title: string;
  duration: number; // in minutes
  sources: EpisodeSource[];
  seasonId: string;
  synopsis?: string;
  comments: EpisodeComment[];
};

export type Season = {
  id: string;
  title: string;
  episodes: Episode[];
};

export type Genre = {
  id: number;
  name: string;
}

export type Anime = {
  id: string;
  title: string;
  description: string;
  genres: Genre[];
  audience: 'Kids' | 'Teens' | 'Adults';
  rating: number;
  imageUrl: string;
  trailerUrl?: string;
  status: 'Airing' | 'Finished' | 'Upcoming';
  announcement?: string;
  comments: Comment[];
  seasons: Season[];
  isFeatured?: boolean;
};

// For public user profiles
export type CommentForProfile = {
  anime_id: string;
  anime_title: string;
  text: string;
  timestamp: string;
}

export type PublicUser = {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  joined: string;
  comments: CommentForProfile[];
}

export type SupportTicket = {
    id: number;
    user_email: string;
    subject: string;
    message: string;
    timestamp: string;
    status: 'open' | 'closed' | 'in-progress';
    ticket_type: 'disabled-account' | 'general-inquiry' | 'bug-report' | 'suggestion';
    user_id?: string | null;
    user?: Pick<User, 'id' | 'name' | 'username'> | null;
}

export type Ally = {
  id: string;
  name: string;
  imageUrl: string;
  description?: string;
  mainUrl?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    discord?: string;
    youtube?: string;
  };
  isFeatured?: boolean;
};

export type Developer = {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
  socialMedia?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
  };
};
    
