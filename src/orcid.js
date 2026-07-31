// orcid.js
// Thin client around ORCID's public API. No OAuth token is required for
// public data - https://pub.orcid.org supports content negotiation, so a
// plain GET with an "Accept: application/json" header is enough.

const PUBLIC_BASE_URL = "https://pub.orcid.org/v3.0";

export function isValidOrcidFormat(orcid) {
  return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcid);
  }

  export async function getOrcidRecord(orcidId) {
    if (!isValidOrcidFormat(orcidId)) {
        throw new Error(`"${orcidId}" is not a validly formatted ORCID iD (expected e.g. 0000-0002-1825-0097).`);
          }

            const res = await fetch(`${PUBLIC_BASE_URL}/${orcidId}/record`, {
                headers: { Accept: "application/json" },
                  });

                    if (res.status === 404) return null;
                      if (!res.ok) {
                          throw new Error(`ORCID record lookup failed: ${res.status} ${res.statusText}`);
                            }

                              const json = await res.json();
                                return simplifyRecord(orcidId, json);
                                }

                                export async function getOrcidWorks(orcidId) {
                                  if (!isValidOrcidFormat(orcidId)) {
                                      throw new Error(`"${orcidId}" is not a validly formatted ORCID iD.`);
                                        }

                                          const res = await fetch(`${PUBLIC_BASE_URL}/${orcidId}/works`, {
                                              headers: { Accept: "application/json" },
                                                });

                                                  if (res.status === 404) return [];
                                                    if (!res.ok) {
                                                        throw new Error(`ORCID works lookup failed: ${res.status} ${res.statusText}`);
                                                          }

                                                            const json = await res.json();
                                                              return simplifyWorks(json);
                                                              }

                                                              export async function searchOrcid(query, { rows = 10 } = {}) {
                                                                const url = `${PUBLIC_BASE_URL}/search?q=${encodeURIComponent(query)}&rows=${rows}`;
                                                                  const res = await fetch(url, { headers: { Accept: "application/json" } });

                                                                    if (!res.ok) {
                                                                        throw new Error(`ORCID search failed: ${res.status} ${res.statusText}`);
                                                                          }

                                                                            const json = await res.json();
                                                                              const results = json.result || [];
                                                                                return results.map((r) => r["orcid-identifier"].path);
                                                                                }

                                                                                function simplifyRecord(orcidId, record) {
                                                                                  const person = record.person || {};
                                                                                    const name = person.name || {};
                                                                                      const employments =
                                                                                          (record["activities-summary"] &&
                                                                                                record["activities-summary"].employments &&
                                                                                                      record["activities-summary"].employments["affiliation-group"]) ||
                                                                                                          [];
                                                                                                          
                                                                                                            const currentEmployment = employments[0]?.summaries?.[0]?.["employment-summary"];
                                                                                                            
                                                                                                              return {
                                                                                                                  orcidId,
                                                                                                                      orcidUrl: `https://orcid.org/${orcidId}`,
                                                                                                                          givenNames: name["given-names"] ? name["given-names"].value : null,
                                                                                                                              familyName: name["family-name"] ? name["family-name"].value : null,
                                                                                                                                  creditName: name["credit-name"] ? name["credit-name"].value : null,
                                                                                                                                      currentInstitution: currentEmployment ? currentEmployment.organization.name : null,
                                                                                                                                          currentRole: currentEmployment ? currentEmployment["role-title"] : null,
                                                                                                                                            };
                                                                                                                                            }
                                                                                                                                            
                                                                                                                                            function simplifyWorks(worksResponse) {
                                                                                                                                              const groups = worksResponse.group || [];
                                                                                                                                                return groups.map((g) => {
                                                                                                                                                    const summary = g["work-summary"][0];
                                                                                                                                                        return {
                                                                                                                                                              title: summary.title && summary.title.title ? summary.title.title.value : "Untitled",
                                                                                                                                                                    type: summary.type,
                                                                                                                                                                          publicationYear: summary["publication-date"]?.year?.value || null,
                                                                                                                                                                                putCode: summary["put-code"],
                                                                                                                                                                                      externalIds: (summary["external-ids"]?.["external-id"] || []).map((e) => ({
                                                                                                                                                                                              type: e["external-id-type"],
                                                                                                                                                                                                      value: e["external-id-value"],
                                                                                                                                                                                                              url: e["external-id-url"]?.value || null,
                                                                                                                                                                                                                    })),
                                                                                                                                                                                                                        };
                                                                                                                                                                                                                          });
                                                                                                                                                                                                                          }
                                                                                                                                                                                                                          
