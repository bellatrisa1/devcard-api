export const employerQuery = `query {
  profile {
    name
    description
    skills {
      name
    }
    experience {
      company
      position
    }
    projects {
      name
    }
  }
}`;

export const fullQuery = `query {
  profile {
    id name headline description githubUrl telegramUrl
    skills { id name }
    experience {
      id company position startDate endDate
      achievements { id text }
    }
    projects { id name description repositoryUrl demoUrl }
  }
}`;
