import { inspect } from 'util'
import core from '@actions/core'
import github from '@actions/github'

export default async function ({ octokit, workflow_id, run_id, before, jobName }) {
  // Get current run of this workflow
  const { data: { workflow_runs } } = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs', {
    ...github.context.repo,
    workflow_id
  })

  const waiting_for = []

  // Process each workflow run
  for (const run of workflow_runs) {
    if (run.id === run_id) continue // Skip current run
    if (new Date(run.run_started_at) >= before) continue // Skip newer runs

    // Get jobs for this run
    const { data: { jobs: runJobs } } = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs', {
      ...github.context.repo,
      run_id: run.id
    })

    // Find matching job by name
    const matchingJob = runJobs.find(job => job.name === jobName)
    if (matchingJob && ['in_progress', 'queued', 'waiting', 'pending', 'action_required', 'requested'].includes(matchingJob.status)) {
      waiting_for.push({
        id: run.id,
        status: matchingJob.status,
        job_id: matchingJob.id,
        job_name: matchingJob.name
      })
    }
  }

  core.info(`found ${waiting_for.length} jobs waiting`)
  core.debug(inspect(waiting_for.map(run => ({ id: run.id, job_id: run.job_id, name: run.job_name }))))

  return waiting_for
}