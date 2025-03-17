import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Task } from "@lit/task";

type Signee = {
  name: string;
  signedTime: string;
};

@customElement("custom-signee-list")
export class CustomSigneeList extends LitElement {
  static styles = css`
    h3 {
      font-size: 1.3rem;
      margin: 0;
    }

    ul {
      font-size: 1.125rem;
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    hr {
      border-top: 0.5px dashed #bcbfc5;
      width: 80%;
      margin-left: 0;
      margin-top: 0;
      margin-bottom: 0.25rem;
    }

    i {
      color: #68707c;
    }
  `;

  @property({ type: String })
  org = "Verdens Beste Org AS";

  private _signeeTask = new Task(this, {
    task: async () => {
      const hashPaths = window.location.hash.split("/").filter(Boolean);
      const instanceOwnerPartyId = hashPaths[2];
      const instanceGuid = hashPaths[3];

      const response = await fetch(
        `/@ViewBag.Org/@ViewBag.App/instances/${instanceOwnerPartyId}/${instanceGuid}/signing`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch signees: ${response.statusText}`);
      }

      const data: { signeeStates: Signee[] } = await response.json();
      return [
        ...data.signeeStates
          .filter((signee) => !!signee.signedTime)
          .map((signee) => ({
            ...signee,
            signedTime: formatDateTime(signee.signedTime),
          })),
      ];
    },
    args: () => [],
  });

  render() {
    return html`
      ${this._signeeTask.render({
        pending: () => html`<p>Loading...</p>`,
        complete: (signees) => {
          console.log(signees);
          if (signees.length === 0) {
            return html`<p>Ingen har signert ennå</p>`;
          }

          return html`
            <h3>Personer som har signert</h3>
            <ul>
              ${signees.map(
                (signee) => html`
                  <li>
                    ${signee.name} på vegne av ${this.org}
                    <hr />
                    <i>Digitalt signert gjennom Altinn ${signee.signedTime}</i>
                  </li>
                `
              )}
            </ul>
          `;
        },
        rejected: (error: Error) => html`<p>Error: ${error.message}</p>`,
      })}
    `;
  }
}

function formatDateTime(dateTime: string) {
  const date = new Date(dateTime).toLocaleDateString("nb-NO", {
    timeZone: "Europe/Oslo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const time = new Date(dateTime).toLocaleTimeString("nb-NO", {
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    minute: "2-digit",
  });

  return date + " kl. " + time;
}
