const { request, logger } = require("./utils");
const retryer = require("./retryer");
require("dotenv").config();

const fetcher = (variables, token) => {
  return request(
    {
      query: `
      query userInfo($login: String!) {
        user(login: $login) {
          # fetch only owner repos & not forks
          repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
            nodes {
              languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                edges {
                  size
                  node {
                    color
                    name
                  }
                }
              }
            }
          }
        }
      }
      `,
      variables,
    },
    {
      Authorization: `bearer ${token}`,
    }
  );
};

async function fetchTopLanguages(username) {
  if (!username) throw Error("Invalid username");

  let res = await retryer(fetcher, { login: username });

  if (res.data.errors) {
    logger.error(res.data.errors);
    throw Error(res.data.errors[0].message || "Could not fetch user");
  }

  let repoNodes = res.data.data.user.repositories.nodes;

  const langsMap = {};
  for (const node of repoNodes) {
    if (!node.languages.edges.length) continue;
    const { name, color } = node.languages.edges[0].node;
    if (!langsMap[name]) {
      langsMap[name] = {
        name,
        color,
        size: 1,
      };
      continue;
    }
    langsMap[name].size += 1;
  }

  const langsRank = Object.keys(langsMap)
    .map(k => langsMap[k])
    .sort((a, b) => b.size - a.size);

  const topLangs = langsRank
    .slice(0, 10)
    .reduce((result, { name }) => {
      result[name] = langsMap[name];
      return result;
    }, {});

  return topLangs;
}

module.exports = fetchTopLanguages;
