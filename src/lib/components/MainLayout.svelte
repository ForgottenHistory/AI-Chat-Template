<script lang="ts">
	import type { User, Character } from '$lib/server/db/schema';
	import { onMount } from 'svelte';
	import { getCharactersCache, setCharactersCache, isCharactersCacheLoaded } from '$lib/stores/characters';

	interface Props {
		user: User;
		currentPath: string;
	}

	let { user, currentPath }: Props = $props();

	let sidebarCollapsed = $state(false);
	let characters = $state<Character[]>(getCharactersCache());

	onMount(() => {
		// Load sidebar collapsed state from localStorage
		const savedState = localStorage.getItem('sidebarCollapsed');
		if (savedState !== null) {
			sidebarCollapsed = savedState === 'true';
		}

		// Only fetch if not already loaded, otherwise use cache
		if (!isCharactersCacheLoaded()) {
			loadCharacters();
		}

		// Listen for character updates from other components
		const handleCharacterUpdate = () => {
			loadCharacters();
		};
		window.addEventListener('characterUpdated', handleCharacterUpdate);

		return () => {
			window.removeEventListener('characterUpdated', handleCharacterUpdate);
		};
	});

	// Save sidebar state when it changes
	$effect(() => {
		localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString());
	});

	async function loadCharacters() {
		try {
			const response = await fetch('/api/characters');
			const result = await response.json();
			characters = result.characters || [];
			setCharactersCache(characters);
		} catch (error) {
			console.error('Failed to load characters:', error);
		}
	}

	function isActive(path: string): boolean {
		return currentPath === path;
	}

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
	}
</script>

<div class="flex h-screen bg-gray-50">
	<!-- Left Sidebar -->
	<div
		class="bg-white border-r border-gray-200 shadow-lg flex flex-col transition-all duration-300 flex-shrink-0 {sidebarCollapsed
			? 'w-0'
			: 'w-80'} overflow-hidden"
	>
		<!-- Logo/Brand -->
		<div class="p-6 border-b border-gray-200">
			<h1 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
				App Name
			</h1>
		</div>

		<!-- Characters List -->
		<div class="flex-1 overflow-y-auto">
			<div class="p-5">
				<div class="mb-5 px-4 py-2 rounded-xl bg-purple-50 border border-purple-100">
					<h2 class="text-xs font-bold text-purple-700 uppercase tracking-wider">
						Characters ({characters.length})
					</h2>
				</div>

				{#if characters.length === 0}
					<div class="text-center py-12 px-4">
						<div
							class="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center shadow-lg"
						>
							<svg
								class="w-10 h-10 text-purple-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
								/>
							</svg>
						</div>
						<p class="text-gray-700 font-semibold text-sm mb-1">No characters yet</p>
						<p class="text-gray-500 text-xs">Import characters to get started!</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each characters as character}
							<a
								href="/chat/{character.id}"
								class="group relative flex items-center gap-3 p-3 rounded-2xl bg-white border border-gray-200 hover:border-purple-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer transition-all duration-300"
							>
								<!-- Avatar -->
								<div class="relative flex-shrink-0">
									<div
										class="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity"
									></div>
									<div class="relative bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl p-0.5">
										{#if character.thumbnailData || character.imageData}
											<img
												src={character.thumbnailData || character.imageData}
												alt={character.name}
												class="w-16 h-20 rounded-lg object-cover"
											/>
										{:else}
											<div
												class="w-16 h-20 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl"
											>
												{character.name.charAt(0).toUpperCase()}
											</div>
										{/if}
									</div>
								</div>

								<!-- Content -->
								<div class="flex-1 min-w-0">
									<div class="flex items-center justify-between mb-0.5">
										<h3 class="font-bold text-gray-900 truncate">
											{character.name}
										</h3>
									</div>
									{#if character.description}
										<p class="text-xs text-gray-500 truncate">
											{character.description}
										</p>
									{/if}
								</div>

								<!-- Chevron indicator -->
								<svg
									class="w-5 h-5 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all opacity-0 group-hover:opacity-100"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- User Profile at Bottom -->
		<div class="border-t border-gray-200 p-4 bg-gray-50">
			<div class="flex items-center gap-3 p-3 rounded-2xl bg-white border border-gray-200">
				<a href="/profile" class="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition">
					<div class="relative">
						<div
							class="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-sm opacity-50"
						></div>
						<div
							class="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md"
						>
							{user.displayName.charAt(0).toUpperCase()}
						</div>
					</div>
					<div class="flex-1 min-w-0">
						<h3 class="font-bold text-gray-900 truncate text-sm">{user.displayName}</h3>
						<p class="text-xs text-gray-500 truncate">{user.username}</p>
					</div>
				</a>
				<a
					href="/settings"
					class="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
					title="Settings"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</a>
			</div>
		</div>
	</div>

	<!-- Sidebar Toggle Button -->
	<button
		onclick={toggleSidebar}
		class="fixed left-{sidebarCollapsed
			? '0'
			: '[312px]'} top-1/2 -translate-y-1/2 z-50 bg-white border border-gray-200 text-gray-600 p-2 rounded-r-lg shadow-md hover:bg-gray-50 transition"
		title={sidebarCollapsed ? 'Show characters' : 'Hide characters'}
	>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			{#if sidebarCollapsed}
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			{:else}
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 19l-7-7 7-7"
				/>
			{/if}
		</svg>
	</button>

	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col">
		<!-- Top Navigation Bar -->
		<div class="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
			<div class="flex items-center justify-between">
				<!-- Left: Nav Buttons -->
				<div class="flex items-center gap-2">
						<a
							href="/"
							class="px-4 py-2 rounded-lg font-medium transition {isActive('/')
								? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
								: 'text-gray-600 hover:bg-gray-100'}"
						>
							<div class="flex items-center gap-2">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
									/>
								</svg>
								Home
							</div>
						</a>

						<a
							href="/library"
							class="px-4 py-2 rounded-lg font-medium transition {isActive('/library')
								? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
								: 'text-gray-600 hover:bg-gray-100'}"
						>
							<div class="flex items-center gap-2">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
									/>
								</svg>
								Library
							</div>
						</a>

						<a
							href="/prompts"
							class="px-4 py-2 rounded-lg font-medium transition {isActive('/prompts')
								? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
								: 'text-gray-600 hover:bg-gray-100'}"
						>
							<div class="flex items-center gap-2">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								Prompts
							</div>
						</a>

						<a
							href="/tags"
							class="px-4 py-2 rounded-lg font-medium transition {isActive('/tags')
								? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
								: 'text-gray-600 hover:bg-gray-100'}"
						>
							<div class="flex items-center gap-2">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
									/>
								</svg>
								Tags
							</div>
						</a>
				</div>

				<!-- Right: User Menu -->
				<div class="flex items-center gap-3">
					<form method="POST" action="/api/auth/logout">
						<button
							type="submit"
							class="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg transition"
							title="Logout"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
								/>
							</svg>
						</button>
					</form>
				</div>
			</div>
		</div>

		<!-- Page Content -->
		<div class="flex-1 overflow-hidden">
			<slot />
		</div>
	</div>
</div>
