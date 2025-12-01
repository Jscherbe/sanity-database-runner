// database-runner/tests/fixtures/updates/simple-update.js
/**
 * A simple update script for testing purposes.
 * @param {import('@sanity/client').SanityClient} client The initialized Sanity client.
 * @returns {Promise<Array<object>>} An array of mutations to be performed.
 */
export async function run(client) {
  const postIds = await client.fetch(`*[_type == "post"]._id`);
  
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
