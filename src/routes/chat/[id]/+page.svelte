<script lang="ts">
	import type { PageData } from './$types';
	import type { Character, Message } from '$lib/server/db/schema';
	import MainLayout from '$lib/components/MainLayout.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { crossfade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import {
		initSocket,
		joinConversation,
		leaveConversation,
		onNewMessage,
		onTyping,
		removeAllListeners
	} from '$lib/stores/socket';

	const [send, receive] = crossfade({
		duration: 300,
		easing: cubicOut,
		fallback(node, params) {
			const style = getComputedStyle(node);
			const transform = style.transform === 'none' ? '' : style.transform;

			return {
				duration: 300,
				easing: cubicOut,
				css: (t) => `
					transform: ${transform} translateX(${(1 - t) * 200}px);
					opacity: ${t}
				`
			};
		}
	});

	let { data }: { data: PageData } = $props();

	let character = $state<Character | null>(null);
	let messages = $state<Message[]>([]);
	let input = $state('');
	let loading = $state(true);
	let sending = $state(false);
	let conversationId = $state<number | null>(null);
	let collapsed = $state(true);
	let showMenu = $state(false);
	let menuPosition = $state({ x: 0, y: 0 });
	let isTyping = $state(false);
	let messagesContainer: HTMLDivElement;

	onMount(() => {
		loadCharacter();
		loadConversation();

		// Initialize Socket.IO
		initSocket();

		// Setup Socket.IO listeners
		onNewMessage((message: Message) => {
			// Add message to messages array if not already present
			if (!messages.find((m) => m.id === message.id)) {
				messages = [...messages, message];
				// Scroll to bottom after message is added
				setTimeout(scrollToBottom, 100);
			}
		});

		onTyping((typing: boolean) => {
			isTyping = typing;
			// Scroll to bottom when typing starts
			if (typing) {
				setTimeout(scrollToBottom, 100);
			}
		});
	});

	onDestroy(() => {
		// Clean up Socket.IO listeners
		if (conversationId) {
			leaveConversation(conversationId);
		}
		removeAllListeners();
	});

	async function loadCharacter() {
		try {
			const response = await fetch(`/api/characters/${data.characterId}`);
			const result = await response.json();
			character = result.character;
		} catch (error) {
			console.error('Failed to load character:', error);
		}
	}

	async function loadConversation() {
		loading = true;
		try {
			const response = await fetch(`/api/chat/${data.characterId}`);
			const result = await response.json();
			conversationId = result.conversationId;
			messages = result.messages || [];

			// Join Socket.IO room for this conversation
			if (conversationId) {
				joinConversation(conversationId);
			}

			// Scroll to bottom after messages load
			setTimeout(scrollToBottom, 100);
		} catch (error) {
			console.error('Failed to load conversation:', error);
		} finally {
			loading = false;
		}
	}

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	async function sendMessage() {
		if (!input.trim() || sending) return;

		const userMessage = input.trim();
		input = '';
		sending = true;

		try {
			const response = await fetch(`/api/chat/${data.characterId}/send`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: userMessage })
			});

			if (!response.ok) {
				alert('Failed to send message');
				input = userMessage; // Restore input
			}
			// Note: Messages will be added via Socket.IO, no need to update here
		} catch (error) {
			console.error('Failed to send message:', error);
			input = userMessage;
		} finally {
			sending = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	async function resetConversation() {
		if (!conversationId) return;

		const confirmed = confirm('Are you sure you want to reset this conversation? All messages will be deleted.');
		if (!confirmed) return;

		try {
			const response = await fetch(`/api/chat/${conversationId}/reset`, {
				method: 'POST'
			});

			if (response.ok) {
				// Reload the conversation to get the fresh first_mes
				await loadConversation();
			} else {
				alert('Failed to reset conversation');
			}
		} catch (error) {
			console.error('Failed to reset conversation:', error);
			alert('Failed to reset conversation');
		}
	}

	function getSwipes(message: Message): string[] {
		if (!message.swipes) return [message.content];
		try {
			const swipes = JSON.parse(message.swipes);
			return Array.isArray(swipes) ? swipes : [message.content];
		} catch {
			return [message.content];
		}
	}

	function getCurrentSwipeIndex(message: Message): number {
		return message.currentSwipe ?? 0;
	}

	async function swipeMessage(messageId: number, direction: 'left' | 'right') {
		const messageIndex = messages.findIndex(m => m.id === messageId);
		if (messageIndex === -1) return;

		const message = messages[messageIndex];

		if (direction === 'right') {
			// Right swipe = generate new variant (adds to existing swipes)
			await regenerateMessage(messageId);
		} else {
			// Left swipe = go back one variant (wrap around)
			const swipes = getSwipes(message);
			const currentIndex = getCurrentSwipeIndex(message);

			let newIndex = currentIndex - 1;
			if (newIndex < 0) {
				newIndex = swipes.length - 1; // Wrap to end
			}

			try {
				const response = await fetch(`/api/chat/messages/${messageId}/swipe`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ swipeIndex: newIndex })
				});

				if (response.ok) {
					// Update the message locally instead of reloading everything
					const updatedMessage = {
						...message,
						content: swipes[newIndex],
						currentSwipe: newIndex
					};
					messages[messageIndex] = updatedMessage;
					messages = [...messages]; // Trigger reactivity
				}
			} catch (error) {
				console.error('Failed to swipe message:', error);
			}
		}
	}

	async function regenerateMessage(messageId: number) {
		try {
			const response = await fetch(`/api/chat/messages/${messageId}/regenerate`, {
				method: 'POST'
			});

			if (response.ok) {
				await loadConversation();
			} else {
				alert('Failed to regenerate message');
			}
		} catch (error) {
			console.error('Failed to regenerate message:', error);
			alert('Failed to regenerate message');
		}
	}

	async function regenerateLastMessage() {
		// Find the last assistant message
		const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
		if (!lastAssistantMessage) return;

		const confirmed = confirm('This will delete all existing variants and generate a fresh response. Continue?');
		if (!confirmed) return;

		try {
			const response = await fetch(`/api/chat/messages/${lastAssistantMessage.id}/regenerate-fresh`, {
				method: 'POST'
			});

			if (response.ok) {
				await loadConversation();
			} else {
				alert('Failed to regenerate message');
			}
		} catch (error) {
			console.error('Failed to regenerate message:', error);
			alert('Failed to regenerate message');
		}
	}

	function isLastMessage(index: number): boolean {
		return index === messages.length - 1;
	}
</script>


<MainLayout user={data.user} currentPath="/chat">
	<div class="h-full flex flex-col bg-gray-50">
		<!-- Chat Header with Banner -->
		{#if character}
			<div class="relative flex-shrink-0">
				<!-- Banner Image -->
				<div
					class="relative overflow-hidden transition-all duration-300 {collapsed ? 'h-16' : 'h-52'}"
				>
					{#if character.imageData}
						<img
							src={character.imageData}
							alt={character.name}
							class="w-full h-full object-cover"
						/>
					{:else}
						<div class="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
					{/if}
					<div
						class="absolute inset-0 bg-gradient-to-b from-black/20 via-purple-900/30 to-black/70"
					></div>

					<!-- Top Right Buttons -->
					<div class="absolute top-4 right-4 z-30 flex items-center gap-2">
						<!-- Collapse/Expand Button -->
						<button
							onclick={() => (collapsed = !collapsed)}
							class="p-2.5 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 hover:scale-110 transition-all shadow-lg border border-white/20"
							title={collapsed ? 'Expand banner' : 'Collapse banner'}
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								{#if collapsed}
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2.5"
										d="M19 9l-7 7-7-7"
									/>
								{:else}
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2.5"
										d="M5 15l7-7 7 7"
									/>
								{/if}
							</svg>
						</button>

						<!-- Menu Button -->
						<button
							onclick={(e) => {
								if (!showMenu) {
									const rect = e.currentTarget.getBoundingClientRect();
									menuPosition = { x: rect.right - 180, y: rect.bottom + 8 };
								}
								showMenu = !showMenu;
							}}
							class="p-2.5 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 hover:scale-110 transition-all shadow-lg border border-white/20"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2.5"
									d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
								/>
							</svg>
						</button>
					</div>

					<!-- Character Info Overlay -->
					{#if collapsed}
						<!-- Compact mode -->
						<div
							class="absolute bottom-0 left-0 right-0 px-6 py-3 text-white flex items-center justify-between"
						>
							<div class="flex items-center gap-3">
								<h2 class="text-lg font-bold drop-shadow-2xl">{character.name}</h2>
							</div>
						</div>
					{:else}
						<!-- Full mode -->
						<div class="absolute bottom-0 left-0 right-0 p-6 text-white">
							<div class="flex items-center gap-4">
								<!-- Avatar -->
								<div class="relative flex-shrink-0">
									<div
										class="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl blur-lg opacity-60"
									></div>
									<div class="relative p-1 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl">
										{#if character.imageData}
											<img
												src={character.imageData}
												alt={character.name}
												class="w-24 h-32 rounded-xl object-cover border-4 border-white shadow-2xl"
											/>
										{:else}
											<div
												class="w-24 h-32 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl border-4 border-white shadow-2xl"
											>
												{character.name.charAt(0).toUpperCase()}
											</div>
										{/if}
									</div>
								</div>
								<div class="flex-1">
									<h2 class="text-2xl font-bold drop-shadow-2xl">{character.name}</h2>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Dropdown Menu (portal-style) -->
		{#if showMenu}
			<div class="fixed inset-0 z-[998]" onclick={() => (showMenu = false)}></div>
			<div
				class="fixed bg-white backdrop-blur-md border border-gray-200 rounded-xl shadow-xl py-1 min-w-[180px] z-[999]"
				style="left: {menuPosition.x}px; top: {menuPosition.y}px;"
			>
				<button
					onclick={() => {
						showMenu = false;
						resetConversation();
					}}
					class="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-100 transition-all font-medium flex items-center gap-2"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
					Reset Conversation
				</button>
				<button
					onclick={() => {
						showMenu = false;
						window.location.href = '/library';
					}}
					class="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-100 transition-all font-medium flex items-center gap-2"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
					Back to Library
				</button>
			</div>
		{/if}

		<!-- Messages Area -->
		<div class="flex-1 overflow-y-auto px-6 py-6" bind:this={messagesContainer}>
			{#if loading}
				<div class="flex items-center justify-center h-full">
					<div class="text-gray-500">Loading conversation...</div>
				</div>
			{:else if messages.length === 0}
				<div class="flex items-center justify-center h-full">
					<div class="text-center">
						<p class="text-gray-600 mb-2">No messages yet</p>
						<p class="text-sm text-gray-400">Start a conversation!</p>
					</div>
				</div>
			{:else}
				<div class="max-w-4xl mx-auto space-y-4">
					{#each messages as message, index (message.id)}
						<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
							<div class="flex flex-col gap-2 max-w-[70%]">
								{#key `${message.id}-${message.content}`}
									<div
										class="rounded-2xl px-4 py-3 {message.role === 'user'
											? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
											: 'bg-white border border-gray-200 text-gray-900'}"
										in:receive={{ key: `${message.id}-${message.content}` }}
										out:send={{ key: `${message.id}-${message.content}` }}
									>
										<p class="whitespace-pre-wrap">{message.content}</p>
									</div>
								{/key}

								<!-- Swipe controls for assistant messages (only on last message) -->
								{#if message.role === 'assistant' && isLastMessage(index)}
									{@const swipes = getSwipes(message)}
									{@const currentIndex = getCurrentSwipeIndex(message)}
									<div class="flex items-center justify-center gap-2">
										<button
											onclick={() => swipeMessage(message.id, 'left')}
											class="p-1.5 text-gray-400 hover:text-gray-600 transition"
											title="Previous variant (wraps around)"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
											</svg>
										</button>
										<span class="text-xs text-gray-500">{currentIndex + 1} / {swipes.length}</span>
										<button
											onclick={() => swipeMessage(message.id, 'right')}
											class="p-1.5 text-gray-400 hover:text-gray-600 transition"
											title="Generate new variant"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
											</svg>
										</button>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				<!-- Typing Indicator -->
				{#if isTyping}
					<div class="flex justify-start px-6">
						<div class="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3">
							<div class="flex gap-1">
								<div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
								<div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
								<div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
							</div>
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Input Area -->
		<div class="bg-white border-t border-gray-200 px-6 py-4">
			<div class="max-w-4xl mx-auto flex items-end gap-3">
				<button
					onclick={regenerateLastMessage}
					disabled={messages.length === 0 || !messages.some(m => m.role === 'assistant')}
					class="p-3 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition rounded-lg hover:bg-gray-100"
					title="Regenerate last response"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
					</svg>
				</button>
				<textarea
					bind:value={input}
					onkeydown={handleKeydown}
					placeholder="Type a message..."
					rows="1"
					class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
					disabled={sending}
				></textarea>
				<button
					onclick={sendMessage}
					disabled={sending || !input.trim()}
					class="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
				>
					{#if sending}
						Sending...
					{:else}
						Send
					{/if}
				</button>
			</div>
		</div>
	</div>
</MainLayout>
