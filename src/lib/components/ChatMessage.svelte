<script lang="ts">
	import { marked } from 'marked';

	interface Props {
		content: string;
		role: 'user' | 'assistant';
		charName?: string;
		userName?: string;
	}

	let { content, role, charName = 'Character', userName = 'User' }: Props = $props();

	// Custom renderer for RP-style formatting
	function renderMessage(text: string): string {
		// Replace template variables (case-insensitive)
		let processed = text
			.replace(/\{\{char\}\}/gi, charName)
			.replace(/\{\{user\}\}/gi, userName);

		// Normalize whitespace inside asterisks: * text * -> *text*
		// Match asterisk, optional whitespace, content, optional whitespace, asterisk
		processed = processed.replace(/\*(\s*)([^*]+?)(\s*)\*/g, (match, leadingSpace, content, trailingSpace) => {
			return `*${content.trim()}*`;
		});

		// Normalize whitespace inside quotes: " text " -> "text"
		processed = processed.replace(/"(\s*)([^"]+?)(\s*)"/g, (match, leadingSpace, content, trailingSpace) => {
			return `"${content.trim()}"`;
		});

		// Style quoted text "dialogue" BEFORE markdown parsing
		// to avoid matching quotes inside HTML attributes
		processed = processed.replace(/"([^"]+)"/g, '%%DIALOGUE_START%%$1%%DIALOGUE_END%%');

		// Configure marked for safe rendering
		marked.setOptions({
			breaks: true,
			gfm: true
		});

		// Parse markdown
		let html = marked.parse(processed, { async: false }) as string;

		// Convert <em> tags (from *text*) to RP action styling
		html = html.replace(/<em>([^<]+)<\/em>/g, '<span class="rp-action">$1</span>');

		// Restore dialogue styling
		html = html.replace(/%%DIALOGUE_START%%/g, '<span class="rp-dialogue">"');
		html = html.replace(/%%DIALOGUE_END%%/g, '"</span>');

		return html;
	}

	let renderedContent = $derived(renderMessage(content));
</script>

<div class="chat-message {role}">
	{@html renderedContent}
</div>

<style>
	.chat-message {
		line-height: 1.6;
	}

	.chat-message :global(p) {
		margin: 0 0 0.5em 0;
	}

	.chat-message :global(p:last-child) {
		margin-bottom: 0;
	}

	.chat-message :global(.rp-action) {
		color: rgb(156 163 175);
		font-style: italic;
	}

	.chat-message.user :global(.rp-action) {
		color: rgb(219 234 254);
		font-style: italic;
	}

	.chat-message :global(.rp-dialogue) {
		color: rgb(59 130 246);
	}

	.chat-message.user :global(.rp-dialogue) {
		color: rgb(254 249 195);
	}

	.chat-message :global(strong) {
		font-weight: 700;
	}

	.chat-message :global(em) {
		font-style: italic;
	}

	.chat-message :global(code) {
		background: rgba(0, 0, 0, 0.1);
		padding: 0.1em 0.3em;
		border-radius: 0.25em;
		font-family: monospace;
		font-size: 0.9em;
	}

	.chat-message.user :global(code) {
		background: rgba(255, 255, 255, 0.2);
	}

	.chat-message :global(pre) {
		background: rgba(0, 0, 0, 0.05);
		padding: 0.75em;
		border-radius: 0.5em;
		overflow-x: auto;
		margin: 0.5em 0;
	}

	.chat-message.user :global(pre) {
		background: rgba(255, 255, 255, 0.1);
	}

	.chat-message :global(pre code) {
		background: none;
		padding: 0;
	}

	.chat-message :global(ul),
	.chat-message :global(ol) {
		margin: 0.5em 0;
		padding-left: 1.5em;
	}

	.chat-message :global(li) {
		margin: 0.25em 0;
	}

	.chat-message :global(blockquote) {
		border-left: 3px solid rgb(156 163 175);
		padding-left: 0.75em;
		margin: 0.5em 0;
		color: rgb(107 114 128);
	}

	.chat-message.user :global(blockquote) {
		border-left-color: rgba(255, 255, 255, 0.5);
		color: rgba(255, 255, 255, 0.8);
	}
</style>
