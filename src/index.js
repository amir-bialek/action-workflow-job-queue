import { inspect } from 'util'
import core from '@actions/core'
import main from './lib/index.js'

const inputs = {
  token: core.getInput('github-token', { required: true }),
  delay: Number(core.getInput('delay', { required: true })),
  timeout: Number(core.getInput('timeout', { required: true })),
  // Add job name input to identify the specific job
  jobName: process.env.GITHUB_JOB || core.getInput('job-name')
}

function errorHandler ({ message, stack, request }) {
  core.error(`${message}\n${stack}`)
  if (request) {
    const { method, url, body, headers } = request
    core.debug(`${method} ${url}\n\n${inspect(headers)}\n\n${inspect(body)}`)
  }
  process.exit(1)
}

process.on('unhandledRejection', errorHandler)
process.on('uncaughtException', errorHandler)

await main(inputs)