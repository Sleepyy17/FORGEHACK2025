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
                  "text": `**Context:** ${DESCRIPTION} \n\n**Proposed Action:** ${PROPOSEDACTION}`
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
          "name": PRIORITY
        },
      }
    }

    // const issueData = {
    //   fields: {
    //     project: { key: PROJECT_KEY },
    //     summary: message.title,
    //     description: `**Context:** ${message.description} \n\n**Proposed Action:** ${message.proposedAction}`,
    //     issuetype: { "id": "10002" }, // idk need to add different types?
    //     // priority: { name: message.priority || "Medium" }, // default is medium
    //     // assignee: message.assignee ? { name: message.assignee } : undefined,
    //   },
    // };
    

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
    return { statusCode: 500, body: "Internal server error" };
  }
}
