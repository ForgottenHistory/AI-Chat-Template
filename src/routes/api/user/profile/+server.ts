import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// PUT - Update user profile
export const PUT: RequestHandler = async ({ request, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const { displayName, bio, avatarData } = await request.json();

		if (!displayName || !displayName.trim()) {
			return json({ error: 'Display name is required' }, { status: 400 });
		}

		const updateData: any = {
			displayName: displayName.trim(),
			bio: bio?.trim() || null
		};

		if (avatarData) {
			updateData.avatarData = avatarData;
		}

		await db.update(users).set(updateData).where(eq(users.id, parseInt(userId)));

		// Update the cookie
		cookies.set('displayName', displayName.trim(), {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 30 // 30 days
		});

		return json({ success: true });
	} catch (error) {
		console.error('Failed to update profile:', error);
		return json({ error: 'Failed to update profile' }, { status: 500 });
	}
};
