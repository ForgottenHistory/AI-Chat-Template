<script lang="ts">
	import type { PageData } from './$types';
	import MainLayout from '$lib/components/MainLayout.svelte';

	let { data }: { data: PageData } = $props();

	let saving = $state(false);
	let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);
</script>

<svelte:head>
	<title>General Settings | AI Chat</title>
</svelte:head>

<MainLayout user={data.user} currentPath="/general-settings">
	<div class="h-full overflow-y-auto">
		<div class="max-w-5xl mx-auto px-8 py-8">
			<!-- Header -->
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-[var(--text-primary)]">General Settings</h1>
				<p class="text-[var(--text-secondary)] mt-2">Configure application preferences</p>
			</div>

			<!-- Messages -->
			{#if message}
				<div
					class="mb-6 p-4 rounded-xl {message.type === 'success'
						? 'bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)]'
						: 'bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)]'}"
				>
					{message.text}
				</div>
			{/if}

			<!-- Settings Content -->
			<div class="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] p-6">
				<div class="text-center py-12 text-[var(--text-muted)]">
					<svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
					<p class="text-lg font-medium">Coming Soon</p>
					<p class="text-sm mt-1">General settings will be added here</p>
				</div>
			</div>
		</div>
	</div>
</MainLayout>
