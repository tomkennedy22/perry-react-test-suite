import * as https from "https"

function get(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https
      .get(
        { hostname: "hacker-news.firebaseio.com", path, headers: { "User-Agent": "Ground-Control/1.0" } },
        (res) => {
          let body = ""
          res.on("data", (c: string) => (body += c))
          res.on("end", () => {
            try { resolve(JSON.parse(body)) }
            catch { reject(new Error("Invalid JSON from HN API")) }
          })
        }
      )
      .on("error", reject)
  })
}

export interface HNStory {
  id: number
  title: string
  url: string | null
  domain: string | null
  by: string
  score: number
  comments: number
  time: number
}

export async function fetchTopStories(limit = 30): Promise<HNStory[]> {
  const ids: number[] = await get("/v0/topstories.json")
  const items = await Promise.all(ids.slice(0, limit).map((id) => get(`/v0/item/${id}.json`)))
  return items
    .filter((item) => item && item.type === "story")
    .map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url ?? null,
      domain: item.url ? new URL(item.url).hostname.replace(/^www\./, "") : null,
      by: item.by,
      score: item.score ?? 0,
      comments: item.descendants ?? 0,
      time: item.time,
    }))
}
