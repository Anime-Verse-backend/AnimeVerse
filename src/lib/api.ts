// --- REAL API SERVICE ---
// This file connects the Next.js frontend to a real backend API.
// It uses `fetch` to make HTTP requests to the endpoints defined in Python.

import type { Ally, Anime, User, Comment, Season, Episode, StaffChatMessage, EpisodeComment, PublicUser, Genre, SupportTicket, Developer } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// --- HELPER FUNCTIONS ---

const getAuthHeader = () => {
    // Retrieves the token from localStorage to authorize requests.
    const token = typeof window !== 'undefined' ? localStorage.getItem('animeverse-auth-token') : null;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

async function handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
        return {} as T;
    }
    const text = await response.text();
    if (!response.ok) {
        let error;
        try {
            error = JSON.parse(text);
        } catch (e) {
            error = { message: text || response.statusText };
        }
        throw new Error(error.message || 'An error occurred');
    }
    return text ? JSON.parse(text) : ({} as T);
}

const buildUrl = (path: string, params?: Record<string, any>) => {
    const url = new URL(`${API_URL}${path}`);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                url.searchParams.append(key, String(value));
            }
        });
    }
    return url.toString();
}

const buildFormData = (data: Record<string, any>): FormData => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        // This is now only used for Anime form, which handles base64 separately
        if (key === 'imageFile' && value instanceof File) {
             // This case might not be used if we switch everything to base64
        } else if (key === 'genre' && Array.isArray(value)) {
            formData.append(key, value.join(','));
        } else if (value !== null && value !== undefined) {
             if (typeof value === 'object' && value !== null && !(value instanceof File)) {
                formData.append(key, JSON.stringify(value));
            } else {
                formData.append(key, String(value));
            }
        }
    });
    return formData;
};


// --- AUTHENTICATION ---

export const login = async (email: string, password?: string): Promise<{ token: string, user: User }> => {
    const response = await fetch(buildUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
};

export const logout = async (): Promise<void> => {
    // In a real app, you might want to invalidate the token on the server
    console.log("User logged out, cleared local token.");
    return;
};

export const register = async (name: string, email: string, password?: string): Promise<User> => {
    const response = await fetch(buildUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
    });
    return handleResponse(response);
};

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
    const response = await fetch(buildUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    return handleResponse(response);
}

export const resetPassword = async (token: string, password: string): Promise<{ message: string }> => {
    const response = await fetch(buildUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
    });
    return handleResponse(response);
}


export const getCurrentUser = async (): Promise<User> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('animeverse-auth-token') : null;
    if (!token) throw new Error("No auth token found");
    
    const response = await fetch(buildUrl('/api/users/me'), {
        headers: getAuthHeader(),
    });
    return handleResponse(response);
};


// --- ANIME ---

export const getAnimes = async (filters: { q?: string, genre?: string, status?: string, sort_by?: string, isFeatured?: boolean } = {}): Promise<Anime[]> => {
    const response = await fetch(buildUrl('/api/animes', filters));
    return handleResponse(response);
};

export const getAnimeById = async (id: string): Promise<Anime | undefined> => {
    if (!id) return undefined;
    const response = await fetch(buildUrl(`/api/animes/${id}`), {
        headers: getAuthHeader(),
    });
    return handleResponse(response);
};

export const getAnimesForHome = async (): Promise<Record<string, Anime[]>> => {
    const response = await fetch(buildUrl('/api/animes/home-sections'));
    return handleResponse(response);
}

type AnimeMutationData = Omit<Anime, 'id' | 'comments' | 'seasons' | 'genres'> & { imageBase64?: string | null, genre: string[] };

export const addAnime = async (animeData: AnimeMutationData): Promise<Anime> => {
    const formData = buildFormData(animeData);
    const response = await fetch(buildUrl('/api/animes'), {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData,
    });
    return handleResponse(response);
}

export const updateAnime = async (id: string, animeData: Partial<AnimeMutationData>): Promise<Anime> => {
    const formData = buildFormData(animeData);
    const response = await fetch(buildUrl(`/api/animes/${id}`), {
        method: 'PATCH',
        headers: getAuthHeader(), // No 'Content-Type', browser sets it for FormData
        body: formData,
    });
    return handleResponse(response);
};


export const deleteAnime = async (id: string): Promise<void> => {
    await fetch(buildUrl(`/api/animes/${id}`), {
        method: 'DELETE',
        headers: getAuthHeader(),
    });
};


// --- USERS ---

export const getUserProfile = async (username: string): Promise<PublicUser> => {
    const response = await fetch(buildUrl(`/api/profiles/${username}`));
    return handleResponse(response);
}

export const getUsers = async (query?: string): Promise<User[]> => {
    const response = await fetch(buildUrl('/api/users', { q: query }), { headers: getAuthHeader() });
    return handleResponse(response);
};

export const updateUserRole = async (userId: string, role: User['role']): Promise<User> => {
    const response = await fetch(buildUrl(`/api/users/${userId}/role`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ role }),
    });
    return handleResponse(response);
}

export const updateUserStatus = async (userId: string, status: User['status']): Promise<User> => {
    const response = await fetch(buildUrl(`/api/users/${userId}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status }),
    });
    return handleResponse(response);
}

export const deleteUser = async (userId: string): Promise<void> => {
    await fetch(buildUrl(`/api/users/${userId}`), {
        method: 'DELETE',
        headers: getAuthHeader(),
    });
};

export const updateProfile = async (profileData: { name?: string; bio?: string; showActivity?: boolean }): Promise<User> => {
    const response = await fetch(buildUrl('/api/users/me'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(profileData),
    });
    return handleResponse(response);
}

export const updatePassword = async (currentPassword: string, newPassword: string):Promise<void> => {
    const response = await fetch(buildUrl('/api/users/me/password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ currentPassword, newPassword }),
    });
    await handleResponse(response);
}

export const updateAvatar = async (avatarBase64: string): Promise<string> => {
    const response = await fetch(buildUrl('/api/users/me/avatar'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ avatarBase64 }),
    });
    const { avatarUrl } = await handleResponse<{avatarUrl: string}>(response);
    return avatarUrl;
}


// --- COMMENTS ---

export const addComment = async (animeId: string, data: { text?: string; parentId?: string; mediaBase64?: string | null }): Promise<Comment> => {
    const response = await fetch(buildUrl(`/api/animes/${animeId}/comments`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
    });
    return handleResponse(response);
};

export const updateComment = async (animeId: string, commentId: string, text: string): Promise<Comment> => {
    const response = await fetch(buildUrl(`/api/animes/${animeId}/comments/${commentId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ text }),
    });
    return handleResponse(response);
};

export const deleteComment = async (animeId: string, commentId: string): Promise<void> => {
    await fetch(buildUrl(`/api/animes/${animeId}/comments/${commentId}`), {
        method: 'DELETE',
        headers: getAuthHeader(),
    });
}

// --- EPISODE COMMENTS ---
export const getEpisodeComments = async (episodeId: string): Promise<EpisodeComment[]> => {
    const response = await fetch(buildUrl(`/api/episodes/${episodeId}/comments`), { headers: getAuthHeader() });
    return handleResponse(response);
}

export const addEpisodeComment = async (episodeId: string, data: { text?: string; parentId?: string; mediaBase64?: string | null }): Promise<EpisodeComment> => {
    const response = await fetch(buildUrl(`/api/episodes/${episodeId}/comments`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
    });
    return handleResponse(response);
};

export const updateEpisodeComment = async (episodeId: string, commentId: string, text: string): Promise<EpisodeComment> => {
    const response = await fetch(buildUrl(`/api/episodes/${episodeId}/comments/${commentId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ text }),
    });
    return handleResponse(response);
};

export const deleteEpisodeComment = async (episodeId: string, commentId: string): Promise<void> => {
    await fetch(buildUrl(`/api/episodes/${episodeId}/comments/${commentId}`), {
        method: 'DELETE',
        headers: getAuthHeader(),
    });
};

// --- SEASONS & EPISODES ---

export const addSeason = async (animeId: string, seasonData: Omit<Season, 'id'|'episodes'>): Promise<Season> => {
    const response = await fetch(buildUrl(`/api/animes/${animeId}/seasons`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(seasonData),
    });
    return handleResponse(response);
};

export const addEpisode = async (animeId: string, seasonId: string, episodeData: Omit<Episode, 'id' | 'seasonId' | 'comments'>): Promise<Episode> => {
    const response = await fetch(buildUrl(`/api/animes/${animeId}/seasons/${seasonId}/episodes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(episodeData),
    });
    return handleResponse(response);
};

export const deleteEpisode = async (animeId: string, seasonId: string, episodeId: string): Promise<void> => {
    await fetch(buildUrl(`/api/animes/${animeId}/seasons/${seasonId}/episodes/${episodeId}`), {
        method: 'DELETE',
        headers: getAuthHeader(),
    });
}

export const updateEpisode = async (animeId: string, seasonId: string, episodeId: string, episodeData: Partial<Omit<Episode, 'id' | 'seasonId' | 'comments'>>): Promise<Episode> => {
    const response = await fetch(buildUrl(`/api/animes/${animeId}/seasons/${seasonId}/episodes/${episodeId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(episodeData),
    });
    return handleResponse(response);
};


// --- STAFF CHAT ---

export const getStaffChatMessages = async (): Promise<StaffChatMessage[]> => {
    const response = await fetch(buildUrl('/api/staff-chat'), { headers: getAuthHeader() });
    return handleResponse(response);
};

export const postStaffChatMessage = async (data: { text?: string; parentId?: string; mediaBase64?: string | null }): Promise<StaffChatMessage> => {
    const response = await fetch(buildUrl('/api/staff-chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
    });
    return handleResponse(response);
};

export const updateStaffChatMessage = async (messageId: string, text: string): Promise<StaffChatMessage> => {
    const response = await fetch(buildUrl(`/api/staff-chat/${messageId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ text }),
    });
    return handleResponse(response);
};

export const deleteStaffChatMessage = async (messageId: string): Promise<void> => {
    await fetch(buildUrl(`/api/staff-chat/${messageId}`), {
        method: 'DELETE',
        headers: getAuthHeader(),
    });
};


// --- MISC ---

export const getGenres = async (): Promise<Genre[]> => {
    const response = await fetch(buildUrl('/api/genres'));
    return handleResponse(response);
};

export const getAdminDashboardStats = async (): Promise<{totalAnimes: number, totalUsers: number, viewsLast24h: number, pendingReviews: number}> => {
    // This is a mock implementation. A real implementation would query the backend.
    const animes = await getAnimes();
    const users = await getUsers();
    return {
        totalAnimes: animes.length,
        totalUsers: users.length,
        viewsLast24h: Math.floor(Math.random() * 5000) + 1000,
        pendingReviews: Math.floor(Math.random() * 20),
    };
};

export const submitDisabledAccountTicket = async (email: string, message: string): Promise<{message: string}> => {
    const response = await fetch(buildUrl('/api/support/disabled-account'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message }),
    });
    return handleResponse(response);
};

// --- SUPPORT TICKETS ---
export const submitTicket = async (data: { subject: string; message: string, ticketType: string }): Promise<{message: string}> => {
    const response = await fetch(buildUrl('/api/support/ticket'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
    });
    return handleResponse(response);
};

export const getSupportTickets = async (): Promise<SupportTicket[]> => {
    const response = await fetch(buildUrl('/api/support/tickets'), { headers: getAuthHeader() });
    return handleResponse(response);
};

export const updateTicketStatus = async (ticketId: number, status: SupportTicket['status']): Promise<SupportTicket> => {
    const response = await fetch(buildUrl(`/api/support/tickets/${ticketId}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status }),
    });
    return handleResponse(response);
};

// --- ALLIES ---
export const getAllies = async (): Promise<Ally[]> => {
    const response = await fetch(buildUrl('/api/allies'));
    return handleResponse(response);
};

type AllyMutationData = Omit<Ally, 'id'> & { imageBase64?: string | null };

export const addAlly = async (allyData: AllyMutationData): Promise<Ally> => {
    const response = await fetch(buildUrl('/api/allies'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(allyData),
    });
    return handleResponse(response);
}

export const updateAlly = async (id: string, allyData: Partial<AllyMutationData>): Promise<Ally> => {
    const response = await fetch(buildUrl(`/api/allies/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(allyData),
    });
    return handleResponse(response);
};

export const deleteAlly = async (id: string): Promise<void> => {
    await fetch(buildUrl(`/api/allies/${id}`), {
        method: 'DELETE',
        headers: getAuthHeader(),
    });
};

// --- DEVELOPERS ---
export const getDevelopers = async (): Promise<Developer[]> => {
    const response = await fetch(buildUrl('/api/developers'));
    return handleResponse(response);
};

type DeveloperMutationData = Omit<Developer, 'id'> & { imageBase64?: string | null };

export const addDeveloper = async (devData: DeveloperMutationData): Promise<Developer> => {
    const response = await fetch(buildUrl('/api/developers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(devData),
    });
    return handleResponse(response);
}

export const updateDeveloper = async (id: string, devData: Partial<DeveloperMutationData>): Promise<Developer> => {
    const response = await fetch(buildUrl(`/api/developers/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(devData),
    });
    return handleResponse(response);
};

export const deleteDeveloper = async (id: string): Promise<void> => {
    await fetch(buildUrl(`/api/developers/${id}`), {
        method: 'DELETE',
        headers: getAuthHeader(),
    });
};
