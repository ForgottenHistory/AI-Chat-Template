<script lang="ts">
	import type { Character } from '$lib/server/db/schema';

	interface Props {
		character: Character;
		imagePreview: string | null;
		changingImage: boolean;
		error: string | null;
		success: string | null;
		onImageChange: (event: Event) => void;
	}

	let { character, imagePreview, changingImage, error, success, onImageChange }: Props = $props();
</script>

<div class="space-y-4">
	<h3 class="text-xl font-semibold text-[var(--text-primary)] mb-4">Edit Character Image</h3>

	<div class="flex items-start gap-4">
		<!-- Current Image Preview -->
		<div class="flex-shrink-0">
			<div
				class="w-32 h-32 rounded-xl overflow-hidden bg-[var(--bg-tertiary)] border-2 border-[var(--border-primary)]"
			>
				<img
					src={imagePreview || character.imageData || ''}
					alt={character.name}
					class="w-full h-full object-cover"
				/>
			</div>
		</div>

		<!-- Upload Button -->
		<div class="flex-1">
			<p class="text-sm text-[var(--text-secondary)] mb-3">
				Change your character's portrait image by uploading a new file.
			</p>
			<label
				class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] hover:opacity-90 text-white font-medium rounded-xl cursor-pointer transition-colors"
			>
				<input
					type="file"
					accept="image/*"
					onchange={onImageChange}
					disabled={changingImage}
					class="hidden"
				/>
				{#if changingImage}
					<div
						class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
					></div>
					Uploading...
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
					Upload Image
				{/if}
			</label>
		</div>
	</div>

	{#if error}
		<div
			class="bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl p-4 text-[var(--error)] text-sm"
		>
			{error}
		</div>
	{/if}

	{#if success}
		<div
			class="bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-xl p-4 text-[var(--success)] text-sm"
		>
			{success}
		</div>
	{/if}
</div>
