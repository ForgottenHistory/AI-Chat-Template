<script lang="ts">
	import type { PageData } from './$types';
	import MainLayout from '$lib/components/MainLayout.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let isEditing = $state(false);
	let displayName = $state(data.user.displayName);
	let bio = $state(data.user.bio || '');
	let avatarFile = $state<File | null>(null);
	let avatarPreview = $state<string | null>(null);
	let saving = $state(false);
	let error = $state('');
	let success = $state('');

	// Update fields when data changes
	$effect(() => {
		displayName = data.user.displayName;
		bio = data.user.bio || '';
	});

	function handleAvatarSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		if (file.size > 5 * 1024 * 1024) {
			error = 'Image must be less than 5MB';
			return;
		}

		if (!file.type.startsWith('image/')) {
			error = 'File must be an image';
			return;
		}

		avatarFile = file;
		const reader = new FileReader();
		reader.onloadend = () => {
			avatarPreview = reader.result as string;
		};
		reader.readAsDataURL(file);
		error = '';
	}

	async function handleSave() {
		error = '';
		success = '';
		saving = true;

		try {
			const response = await fetch('/api/user/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					displayName,
					bio,
					avatarData: avatarPreview || undefined
				})
			});

			if (response.ok) {
				// Update local state immediately
				data.user.displayName = displayName;
				data.user.bio = bio;
				if (avatarPreview) {
					data.user.avatarData = avatarPreview;
				}
				// Invalidate and reload all page data
				await invalidateAll();
				success = 'Profile updated successfully!';
				isEditing = false;
				avatarFile = null;
				avatarPreview = null;
				setTimeout(() => (success = ''), 3000);
			} else {
				const result = await response.json();
				error = result.error || 'Failed to update profile';
			}
		} catch (err) {
			error = 'Failed to update profile';
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		displayName = data.user.displayName;
		bio = data.user.bio || '';
		avatarFile = null;
		avatarPreview = null;
		isEditing = false;
		error = '';
	}
</script>

<svelte:head>
	<title>Profile | AI Chat</title>
</svelte:head>

<MainLayout user={data.user} currentPath="/profile">
	<div class="h-full overflow-y-auto">
		<div class="max-w-3xl mx-auto px-8 py-12 min-h-full">
			<!-- Header -->
			<div class="mb-8">
				<a
					href="/"
					class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 mb-4 transition"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
					Back
				</a>
				<h1 class="text-4xl font-bold text-[var(--text-primary)]">Profile Settings</h1>
				<p class="text-[var(--text-secondary)] mt-2">Manage your account information</p>
			</div>

			<!-- Messages -->
			{#if error}
				<div class="mb-6 p-4 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl text-[var(--error)]">
					{error}
				</div>
			{/if}
			{#if success}
				<div class="mb-6 p-4 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-xl text-[var(--success)]">
					{success}
				</div>
			{/if}

			<!-- Profile Card -->
			<div class="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] shadow-xl overflow-hidden">
				<!-- Cover gradient -->
				<div class="h-32 bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-primary)]"></div>

				<div class="px-8 pb-8">
					<!-- Avatar -->
					<div class="relative -mt-16 mb-6">
						{#if isEditing}
							<label class="inline-block cursor-pointer group">
								{#if avatarPreview || data.user.avatarData}
									<div class="relative">
										<img
											src={avatarPreview || data.user.avatarData}
											alt="Profile"
											class="w-32 h-32 rounded-full border-4 border-[var(--bg-secondary)] shadow-xl object-cover group-hover:opacity-75 transition"
										/>
										<div
											class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
										>
											<svg
												class="w-12 h-12 text-white drop-shadow-lg"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
												/>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
												/>
											</svg>
										</div>
									</div>
								{:else}
									<div
										class="w-32 h-32 rounded-full border-4 border-[var(--bg-secondary)] shadow-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white text-4xl font-bold group-hover:opacity-75 transition"
									>
										{data.user.displayName.charAt(0).toUpperCase()}
									</div>
								{/if}
								<input type="file" accept="image/*" class="hidden" onchange={handleAvatarSelect} />
							</label>
						{:else}
							<div class="inline-block">
								{#if data.user.avatarData}
									<img
										src={data.user.avatarData}
										alt="Profile"
										class="w-32 h-32 rounded-full border-4 border-[var(--bg-secondary)] shadow-xl object-cover"
									/>
								{:else}
									<div
										class="w-32 h-32 rounded-full border-4 border-[var(--bg-secondary)] shadow-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white text-4xl font-bold"
									>
										{data.user.displayName.charAt(0).toUpperCase()}
									</div>
								{/if}
							</div>
						{/if}
					</div>

					{#if !isEditing}
						<!-- View Mode -->
						<div>
							<div class="flex justify-between items-start mb-6">
								<div>
									<h2 class="text-3xl font-bold text-[var(--text-primary)]">
										{data.user.displayName}
									</h2>
									<p class="text-[var(--text-muted)] mt-1">@{data.user.username}</p>
									{#if data.user.bio}
										<p class="text-[var(--text-secondary)] mt-3">{data.user.bio}</p>
									{/if}
								</div>
								<button
									onclick={() => (isEditing = true)}
									class="px-4 py-2 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-medium hover:opacity-90 transition"
								>
									Edit Profile
								</button>
							</div>

							<div class="grid grid-cols-2 gap-4 pt-6 border-t border-[var(--border-primary)]">
								<div>
									<p class="text-sm text-[var(--text-muted)] mb-1">Username</p>
									<p class="font-medium text-[var(--text-primary)]">{data.user.username}</p>
								</div>
								<div>
									<p class="text-sm text-[var(--text-muted)] mb-1">Display Name</p>
									<p class="font-medium text-[var(--text-primary)]">{data.user.displayName}</p>
								</div>
							</div>
						</div>
					{:else}
						<!-- Edit Mode -->
						<form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
							<div class="space-y-6">
								<div>
									<label for="displayName" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
										Display Name
									</label>
									<input
										id="displayName"
										type="text"
										bind:value={displayName}
										class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
										required
									/>
								</div>

								<div>
									<label for="bio" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
										Bio
									</label>
									<textarea
										id="bio"
										bind:value={bio}
										rows="3"
										class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
										placeholder="Tell us about yourself..."
									></textarea>
								</div>

								<div>
									<label for="username" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
										Username
									</label>
									<input
										id="username"
										type="text"
										value={data.user.username}
										disabled
										class="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-muted)] rounded-xl cursor-not-allowed"
									/>
									<p class="text-xs text-[var(--text-muted)] mt-1">Username cannot be changed</p>
								</div>

								<div class="flex gap-3 pt-6">
									<button
										type="submit"
										disabled={saving}
										class="px-6 py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
									>
										{#if saving}
											Saving...
										{:else}
											Save Changes
										{/if}
									</button>
									<button
										type="button"
										onclick={handleCancel}
										disabled={saving}
										class="px-6 py-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-xl font-medium hover:bg-[var(--border-primary)] disabled:opacity-50 transition"
									>
										Cancel
									</button>
								</div>
							</div>
						</form>
					{/if}
				</div>
			</div>
		</div>
	</div>
</MainLayout>
