import { schedule, danger, warn, fail } from "danger"
import { IncomingWebhook } from "@slack/client"
import { PullRequest, Issues } from "github-webhook-event-types"

declare const peril: any // danger/danger#351

const isJest = typeof jest !== "undefined"

// Stores the parameter in a closure that can be invoked in tests.
const storeRFC = (reason: string, closure: () => void | Promise<any>) =>
  // We return a closure here so that the (promise is resolved|closure is invoked)
  // during test time and not when we call rfc().
  () => (closure instanceof Promise ? closure : Promise.resolve(closure()))

// Either schedules the promise for execution via Danger, or invokes closure.
const runRFC = (reason: string, closure: () => void | Promise<any>) =>
  closure instanceof Promise ? schedule(closure) : closure()

const rfc: any = isJest ? storeRFC : runRFC

// https://github.com/artsy/artsy-danger/issues/33
export const rfc33 = rfc("Ping slack channels for related labels", async () => {
  const pr = danger.github.pr
  // You can get the channel ID by opening slack in
  // the web inspector and looking at the channel name
  const labelsMap = {
    consignments: "C52403S10",
  } as any

  // We need an issue to get labels
  const issue = await danger.github.api.issues.get({
    owner: pr.base.user.login,
    repo: pr.base.repo.name,
    number: pr.number,
  })

  // Find the labels in both the map above, and in the PR's labels
  const allWantedLabels = Object.keys(labelsMap)
  const labelsToAlert: string[] = issue.labels.filter((l: string) => allWantedLabels.includes(l))

  // Loop through and send out Slack messages
  for (const label of labelsToAlert) {
    var url = peril.env.SLACK_RFC_WEBHOOK_URL || ""
    var webhook = new IncomingWebhook(url)

    await webhook.send({
      unfurl_links: false,
      channel: labelsMap[label],
      attachments: [
        {
          color: "good",
          title: `Merged: <${pr.base.repo.html_url}|${pr.title}> from ${pr.user.login}`,
          title_link: pr.base.repo.html_url,
          author_name: pr.user.login,
        },
      ],
    })
  }
})
