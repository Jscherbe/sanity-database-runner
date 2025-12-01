// database-runner/tests/manual-test/updates/manual-update.js
/**
 * A simple update script for the manual test.
 * @param {import('@sanity/client').SanityClient} client The initialized Sanity client.
 * @returns {Promise<Array<object>>} An array of mutations to be performed.
 */
export async function run(client) {
  console.log("-> Running manual-update script...");
  // Seed a document to make sure there's something to update
  await client.create({
    _type: "post",
    title: "Manual CLI Test Post",
    slug: { _type: "slug", current: `manual-cli-test-post-${Date.now()}` },
  });
  console.log("-> Seeded 'Manual CLI Test Post'.");

  const postIds = await client.fetch(`*[_type == "post" && title == "Manual CLI Test Post"]._id`);
  
  console.log(`-> Found ${postIds.length} posts to migrate.`);
  const mutations = postIds.map(id => ({
    patch: {
      id: id,
      patch: {
        set: { migratedByCLI: true }
      }
    }
  }));

  return mutations;
}
