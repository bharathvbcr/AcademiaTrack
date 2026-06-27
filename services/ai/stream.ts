/**
 * Streaming helpers shared by the AI providers.
 *
 * Both Ollama (NDJSON) and OpenAI-compatible (SSE) servers send a response body
 * as a sequence of chunks that must be re-assembled across arbitrary network
 * boundaries before each line can be parsed. `readLines` does that buffering and
 * yields complete lines as they arrive.
 */

/** Async-iterate complete text lines from a streaming Response body. */
export async function* readLines(
    body: ReadableStream<Uint8Array>,
    signal?: AbortSignal,
): AsyncGenerator<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
        while (true) {
            if (signal?.aborted) return;
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let newlineIndex: number;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);
                yield line;
            }
        }
        // Flush any trailing content without a newline terminator.
        buffer += decoder.decode();
        if (buffer.length > 0) yield buffer;
    } finally {
        // Releasing the lock lets an aborted fetch tear the connection down cleanly.
        reader.releaseLock();
    }
}
