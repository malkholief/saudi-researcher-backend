// openalex.js
// Thin client around the OpenAlex API. All outbound calls to OpenAlex live
// here so the rest of the app never talks to the network directly.

const BASE_URL = "https://api.openalex.org";

// IMPORTANT: replace this with a real email you control.
// OpenAlex's "polite pool" gives faster, more reliable rate limits to
// requests that identify a contact email. It costs nothing and there's
// no signup - see https://docs.openalex.org/how-to-use-the-api/rate-limits-and-authentication
const CONTACT_EMAIL = process.env.OPENALEX_MAILTO || "your-email@example.com";

/**
 * Find the single best-matching OpenAlex Topic for a free-text field name.
  * e.g. "pharmaceutics" -> { id: "T10627", display_name: "..." }
   * Returns null if nothing matches.
    */
    export async function findTopic(query) {
      const url = `${BASE_URL}/topics?search=${encodeURIComponent(query)}&per_page=1&mailto=${encodeURIComponent(
          CONTACT_EMAIL
            )}`;

              const res = await fetch(url);
                if (!res.ok) {
                    throw new Error(`OpenAlex topics lookup failed: ${res.status} ${res.statusText}`);
                      }
                        const json = await res.json();
                          const topic = json.results && json.results[0];
                            if (!topic) return null;

                              return {
                                  id: topic.id.split("/").pop(), // e.g. "https://openalex.org/T10627" -> "T10627"
                                      displayName: topic.display_name,
                                        };
                                        }

                                        /**
                                         * Find Saudi-affiliated authors tagged with a given OpenAlex topic ID.
                                          * Returns a simplified list of author objects, sorted by works_count desc.
                                           */
                                           export async function findSaudiAuthorsByTopic(topicId, { perPage = 25 } = {}) {
                                             const filter = `last_known_institutions.country_code:sa,topics.id:${topicId}`;
                                               const url =
                                                   `${BASE_URL}/authors?filter=${encodeURIComponent(filter)}` +
                                                       `&per_page=${perPage}&sort=works_count:desc&mailto=${encodeURIComponent(CONTACT_EMAIL)}`;

                                                         const res = await fetch(url);
                                                           if (!res.ok) {
                                                               throw new Error(`OpenAlex authors lookup failed: ${res.status} ${res.statusText}`);
                                                                 }
                                                                   const json = await res.json();
                                                                     const results = json.results || [];

                                                                       return results.map(simplifyAuthor);
                                                                       }

                                                                       function simplifyAuthor(author) {
                                                                         const institution =
                                                                             author.last_known_institutions && author.last_known_institutions[0]
                                                                                   ? author.last_known_institutions[0].display_name
                                                                                         : null;

                                                                                           const topics = (author.topics || [])
                                                                                               .slice(0, 5)
                                                                                                   .map((t) => ({ name: t.display_name, count: t.count }));

                                                                                                     return {
                                                                                                         id: author.id,
                                                                                                             name: author.display_name,
                                                                                                                 orcid: author.orcid || null,
                                                                                                                     institution,
                                                                                                                         worksCount: author.works_count,
                                                                                                                             citedByCount: author.cited_by_count,
                                                                                                                                 hIndex: author.summary_stats ? author.summary_stats.h_index : null,
                                                                                                                                     topics,
                                                                                                                                         openAlexUrl: author.id,
                                                                                                                                           };
                                                                                                                                           }
                                                                                                                                           
