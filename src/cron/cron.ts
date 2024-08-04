import { logger } from "~/utils/logger"
import { detectBrokenAmule } from "./detectBrokenAmule"

const jobs = [
  {
    id: 1,
    everySeconds: 60, // 1 minute
    launchAtStart: false,
    launch: detectBrokenAmule,
  },
]

// Using global as live reload will re-run the file, and variables get lost
declare global {
  var cronJobIntervalIds: NodeJS.Timeout[] | undefined
}

export function initializeJobs() {
  if (globalThis.cronJobIntervalIds) {
    logger.info("[initializeJobs] Clearing old jobs...")
    for (const interval of globalThis.cronJobIntervalIds) {
      clearInterval(interval)
    }
  }

  logger.info("[initializeJobs] Initializing jobs...")
  globalThis.cronJobIntervalIds = jobs.map((job) => {
    const interval = setInterval(() => triggerJob(job), job.everySeconds * 1000)

    if (job.launchAtStart) {
      void triggerJob(job).catch(() => { })
    }

    return interval
  })
}

async function triggerJob(job: typeof jobs[0]) {
  try {
    await job.launch()
  }
  catch {
    logger.error(`[initializeJobs] job ${job.id} (${job.launch.name}) failed. Retrying...`)
    setTimeout(() => void triggerJob(job).catch(() => { }), 10000)
  }
}
