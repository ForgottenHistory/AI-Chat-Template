import { db } from '../db';
import { users, userPersonas } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import type { UserPersona, NewUserPersona } from '../db/schema';

class PersonaService {
	/**
	 * Get all personas for a user
	 */
	async getUserPersonas(userId: number): Promise<UserPersona[]> {
		return await db
			.select()
			.from(userPersonas)
			.where(eq(userPersonas.userId, userId))
			.orderBy(userPersonas.createdAt);
	}

	/**
	 * Get a specific persona by ID
	 */
	async getPersonaById(personaId: number, userId: number): Promise<UserPersona | null> {
		const [persona] = await db
			.select()
			.from(userPersonas)
			.where(and(eq(userPersonas.id, personaId), eq(userPersonas.userId, userId)))
			.limit(1);

		return persona || null;
	}

	/**
	 * Get the active persona for a user (returns null if using default profile)
	 */
	async getActivePersona(userId: number): Promise<UserPersona | null> {
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (!user || !user.activePersonaId) {
			return null;
		}

		return await this.getPersonaById(user.activePersonaId, userId);
	}

	/**
	 * Get the display name and description to use for the user
	 * Returns active persona info if set, otherwise user profile info
	 */
	async getActiveUserInfo(userId: number): Promise<{ name: string; description: string | null; avatarData: string | null }> {
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (!user) {
			return { name: 'User', description: null, avatarData: null };
		}

		if (user.activePersonaId) {
			const persona = await this.getPersonaById(user.activePersonaId, userId);
			if (persona) {
				return {
					name: persona.name,
					description: persona.description,
					avatarData: persona.avatarData
				};
			}
		}

		return {
			name: user.displayName,
			description: user.bio,
			avatarData: user.avatarData
		};
	}

	/**
	 * Create a new persona
	 */
	async createPersona(
		userId: number,
		data: { name: string; description?: string; avatarData?: string }
	): Promise<UserPersona> {
		const [persona] = await db
			.insert(userPersonas)
			.values({
				userId,
				name: data.name,
				description: data.description || null,
				avatarData: data.avatarData || null
			})
			.returning();

		return persona;
	}

	/**
	 * Update an existing persona
	 */
	async updatePersona(
		personaId: number,
		userId: number,
		data: { name?: string; description?: string; avatarData?: string }
	): Promise<UserPersona | null> {
		const [updated] = await db
			.update(userPersonas)
			.set(data)
			.where(and(eq(userPersonas.id, personaId), eq(userPersonas.userId, userId)))
			.returning();

		return updated || null;
	}

	/**
	 * Delete a persona
	 */
	async deletePersona(personaId: number, userId: number): Promise<boolean> {
		// First check if this is the active persona
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		// If deleting the active persona, clear the active persona
		if (user?.activePersonaId === personaId) {
			await db
				.update(users)
				.set({ activePersonaId: null })
				.where(eq(users.id, userId));
		}

		const result = await db
			.delete(userPersonas)
			.where(and(eq(userPersonas.id, personaId), eq(userPersonas.userId, userId)));

		return result.changes > 0;
	}

	/**
	 * Set the active persona for a user (null to use default profile)
	 */
	async setActivePersona(userId: number, personaId: number | null): Promise<boolean> {
		// Verify persona belongs to user if setting one
		if (personaId !== null) {
			const persona = await this.getPersonaById(personaId, userId);
			if (!persona) {
				return false;
			}
		}

		await db
			.update(users)
			.set({ activePersonaId: personaId })
			.where(eq(users.id, userId));

		return true;
	}
}

export const personaService = new PersonaService();
