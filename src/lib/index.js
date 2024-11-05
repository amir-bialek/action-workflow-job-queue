import core from '@actions/core'
import github from '@actions/github'
import runs from './runs.js'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export default async function ({ token, delay, timeout, jobName }) {
  let timer = 0
  const octokit = github.getOctokit(token)
  const { runId: run_id } = github.context

  // Get workflow id and created date from run id
  const { data: { workflow_id, run_started_at, jobs } } = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}', {
    ...github.context.repo,
    run_id
  })

  const before = new Date(run_started_at)
  core.info(`searching for workflow runs before ${before} for job: ${jobName}`)

  // Get previous runs with job information
  let waiting_for = await runs({ octokit, run_id, workflow_id, before, jobName })

  if (waiting_for.length === 0) {
    core.info('no active run of this job found')
    process.exit(0)
  }

  while (waiting_for.find(run => run.status !== 'completed')) {
    timer += delay

    if (timer >= timeout) {
      core.setFailed('job-queue timed out')
      process.exit(1)
    }

    for (const run of waiting_for) {
      core.info(`waiting for job in run #${run.id}: current status: ${run.status}`)
    }

    core.info(`waiting for ${delay/1000} minutes before polling the status again`)
    await sleep(delay)

    waiting_for = await runs({ octokit, run_id, workflow_id, before, jobName })
  }

  core.info('all jobs in the queue completed!')
}
