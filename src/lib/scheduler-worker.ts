import { publishScheduledPosts } from "./publisher";

const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds

async function runScheduler() {
  const timestamp = new Date().toISOString();
  
  try {
    const result = await publishScheduledPosts();
    
    if (result.published > 0 || result.failed > 0) {
      console.error(`[${timestamp}] Published: ${result.published}, Failed: ${result.failed}, Skipped: ${result.skipped}`);
    }
  } catch (error) {
    console.error(`[${timestamp}] Scheduler error:`, error);
  }
}

async function main() {
  console.error("Content Command Center Scheduler Worker started");
  console.error(`Checking for scheduled posts every ${POLL_INTERVAL_MS / 1000} seconds`);
  
  // Run immediately on start
  await runScheduler();
  
  // Then run on interval
  setInterval(runScheduler, POLL_INTERVAL_MS);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
