// database-runner/tests/updates/simple-update.js
/**
 * A simple update script for testing purposes.
 * @param {import('@sanity/client').SanityClient} client The initialized Sanity client.
 * @returns {Promise<Array<object>>} An array of mutations to be performed.
 */
export async function run(client) {
  console.log("-> Running simple-update script...");
  const postIds = await client.fetch(`*[_type == "post" && !defined(migrated)]._id`);
  
  if (postIds.length === 0) {
    console.log("-> No posts to migrate.");
    return [];
  }

  console.log(`-> Found ${postIds.length} posts to migrate.`);
  const mutations = postIds.map(id => ({
    patch: {
      id: id,
      patch: {
        set: { migrated: true }
      }
    }
  }));

  return mutations;
}
