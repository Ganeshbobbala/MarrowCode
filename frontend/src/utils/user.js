/**
 * Gets or creates a persistent unique user ID for the current browser session.
 */
export const getUserId = () => {
    let userId = localStorage.getItem('marroe_user_id');
    if (!userId) {
        // Simple unique ID generator
        userId = `user_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
        localStorage.setItem('marroe_user_id', userId);
    }
    return userId;
};
