<script lang="ts">
	import type { PageData } from './$types';
	import MainLayout from '$lib/components/MainLayout.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>AI Chat</title>
</svelte:head>

<MainLayout user={data.user} currentPath="/">
	<div class="h-full overflow-y-auto">
		<div class="max-w-7xl mx-auto px-8 py-8">
			<div class="bg-white rounded-lg shadow p-8">
				<h2 class="text-2xl font-semibold mb-4 text-gray-900">Welcome!</h2>
				<p class="text-gray-600 mb-6">
					Manage your AI characters, configure settings, and organize your character library.
				</p>

				<div class="grid grid-cols-2 gap-6 mt-8">
					<a
						href="/library"
						class="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition group"
					>
						<div class="flex items-center gap-3 mb-3">
							<div class="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-500 transition">
								<svg
									class="w-6 h-6 text-blue-600 group-hover:text-white transition"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
									/>
								</svg>
							</div>
							<h3 class="text-lg font-semibold text-gray-900">Character Library</h3>
						</div>
						<p class="text-sm text-gray-600">
							Import and manage your character cards. Upload PNG character files.
						</p>
					</a>

					<a
						href="/settings"
						class="p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-lg transition group"
					>
						<div class="flex items-center gap-3 mb-3">
							<div class="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-500 transition">
								<svg
									class="w-6 h-6 text-purple-600 group-hover:text-white transition"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
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
							</div>
							<h3 class="text-lg font-semibold text-gray-900">LLM Settings</h3>
						</div>
						<p class="text-sm text-gray-600">
							Configure your AI models and generation parameters.
						</p>
					</a>
				</div>
			</div>
		</div>
	</div>
</MainLayout>
