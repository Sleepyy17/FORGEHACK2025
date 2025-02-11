import api, { route } from "@forge/api";

// export function messageLogger(payload){
//   console.log(`Logging message: ${payload.message}`);
// }

export const createIssue = async(payload) => {
  try {
    console.log("Received payload:", payload); 
    
    if (!payload) {
      console.error("Missing issue details");
      return { statusCode: 400, body: "Issue details are required" };
    }

    const PROJECT_KEY = payload.projectKey || payload.context.jira.projectKey || "Umm what to do?"; 
    const TITLE = payload.title || "Untitled Issue";
    const DESCRIPTION = payload.description || "No Description Provided"; 
    const PROPOSEDACTION = payload.proposedAction || "No Proposed Action Provided";
    const ASSIGNEE = payload.assignee || undefined;
    const PRIORITY = payload.priority || "Medium";

    if (PROJECT_KEY == "Umm what to do" ) {
      return { statusCode: 400, body: "Project Key not Found" };
    }
    
    let assignableUsers = undefined;
    if (ASSIGNEE != undefined) {
        assignableUsers = await api.asUser().requestJira(route`/rest/api/3/user/assignable/multiProjectSearch?query=${ASSIGNEE}&projectKeys=${PROJECT_KEY}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
    }
    
    
    let USERID = undefined;
    if (assignableUsers != undefined) {
      let assignableUsersJson = await assignableUsers.json();
      if (assignableUsersJson.length > 0) {
        USERID = assignableUsersJson[0].accountId;
      }
    }
    
    console.log(`😎${USERID}`);
    var issueData = {
      "fields": {
        "project":
        {
          "key": PROJECT_KEY
        },
        "summary": TITLE,
        "description": {
          "type": "doc",
          "version": 1,
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": `Context:\n${DESCRIPTION} \n\nProposed Action: \n${PROPOSEDACTION}`
                }
              ]
            }
          ]
        },
        "issuetype": {
          "name": "Task"
        },
        "assignee": {
          "id": USERID,
        },
        "priority": {
          "name": PRIORITY,
        },
      }
    }
    

    const response = await api.asApp().requestJira(route`/rest/api/3/issue`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(issueData),
    });

    const data = await response.json();

    if (response.status !== 201) {
      console.error(`Failed to create issue: ${JSON.stringify(data)}`);
      return { statusCode: response.status, body: `Error: ${data.errorMessages}` };
    }

    console.log(`Issue created successfully: ${data.key}`);
    return { statusCode: 201, body: `Issue created successfully: ${data.key}` };

  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
    return { statusCode: 500, body: "Yeah its Over." };
  }
}


export const findSimilarIssues = async (payload) => {
  try {
    const task = payload.task || null
    const projectKey = payload.projectKey || payload.context?.jira?.projectKey || null
    if (!task) {
      throw new Error('Task name is required')
    }

    if (!projectKey) {
      throw new Error('project key is required')
    }
    
    const response = await api.asUser().requestJira(route`/rest/api/3/search?jql=project="${projectKey}"`)
    const data = await response.json()
    console.log(data);
    return data.issues.map(issue => ({
      summary: issue.fields.summary
    }))
  }
  catch (error) {
    console.error(`Unexpected error: ${error.message}`);
    return { statusCode: 500, body: "No Issues Ignore the message" };
  }
}

// if the status is done then do not worry about it
export const deleteIssues = async(payload) => {
  const desc = payload.desc || null
  if (!desc) {
    throw new Error('Task summary is required')
  }

  const response = await api.asUser().requestJira(route`/rest/api/3/search?jql=summary~"${desc}"`, {
    headers: {
      'Accept': 'application/json'
    }
  });
  const data = await response.json();
  for (let i in data.issues) {
    const issueKey = data.issues[i].key
    const deleteResponse = await api.asUser().requestJira(route`/rest/api/3/issue/${issueKey}`, {
      method: 'DELETE'
    });
  }
}
