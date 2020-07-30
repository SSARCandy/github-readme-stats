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
              name
              primaryLanguage {
                name
                color
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

  const { nodes } = res.data.data.user.repositories;

  const langsMap = {};
  for (const node of nodes) {
    if (!node.primaryLanguage) continue;
    const { name, color } = node.primaryLanguage;
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
  console.log(langsMap)

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
