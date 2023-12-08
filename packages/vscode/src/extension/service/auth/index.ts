import {
  AuthenticationProvider,
  AuthenticationProviderAuthenticationSessionsChangeEvent,
  AuthenticationSession,
  Disposable,
  Event,
  EventEmitter,
  ExtensionContext,
  ProgressLocation,
  Uri,
  UriHandler,
  authentication,
  env,
  window,
} from "vscode";
import { v4 as uuidv4 } from "uuid";
import { capture } from "../logging/posthog";

const CODEMUSE_APP_URL = "http://localhost:3000";

const AUTH_TYPE = `codemuse`;
const AUTH_NAME = `CodeMuse`;
const SESSIONS_SECRET_KEY = `${AUTH_TYPE}.sessions`;

export class CodeMuseAuthenticationProvider implements AuthenticationProvider {
  private context: ExtensionContext = null as any;
  private disposable: Disposable;
  private uriHandler: UriHandler;
  private eventEmitter = new EventEmitter<{
    requestId: string;
    token: string;
  }>();
  private sessionChangeEmitter =
    new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();

  constructor(context: ExtensionContext) {
    this.context = context;

    this.uriHandler = {
      handleUri: this.handleUri,
    };

    this.disposable = Disposable.from(
      authentication.registerAuthenticationProvider(
        AUTH_TYPE,
        AUTH_NAME,
        this,
        { supportsMultipleAccounts: false }
      ),
      window.registerUriHandler(this.uriHandler)
    );
  }

  public async dispose() {
    this.disposable.dispose();
  }

  get onDidChangeSessions() {
    return this.sessionChangeEmitter.event;
  }

  public async getSessions(
    scopes?: string[]
  ): Promise<readonly AuthenticationSession[]> {
    const allSessions = await this.context.secrets.get(SESSIONS_SECRET_KEY);

    if (allSessions) {
      return JSON.parse(allSessions) as AuthenticationSession[];
    }

    return [];
  }

  public async removeSession(sessionId: string): Promise<void> {
    const allSessions = await this.context.secrets.get(SESSIONS_SECRET_KEY);
    if (allSessions) {
      let sessions = JSON.parse(allSessions) as AuthenticationSession[];
      const sessionIdx = sessions.findIndex((s) => s.id === sessionId);
      sessions.splice(sessionIdx, 1);

      await this.context.secrets.store(
        SESSIONS_SECRET_KEY,
        JSON.stringify(sessions)
      );
    }
  }

  private handleUri = async (uri: Uri) => {
    const query = new URLSearchParams(uri.query);
    const token = query.get("token");
    const requestId = query.get("request_id");

    if (!token) {
      throw new Error("No token");
    }

    if (!requestId) {
      throw new Error("No request id");
    }

    this.eventEmitter.fire({
      requestId,
      token,
    });

    return;
  };

  createSession(scopes: readonly string[]): Thenable<AuthenticationSession> {
    return window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: "CodeMuse: Authenticating",
        cancellable: true,
      },
      async (progress, cancellationToken) => {
        const requestId = uuidv4().slice(0, 32);

        const redirectURI = new URL(`${env.uriScheme}://codemuse-app.codemuse`);
        redirectURI.searchParams.set("request_id", requestId);

        const escapedRedirectURI = encodeURIComponent(redirectURI.toString());

        const uri = Uri.parse(
          `${CODEMUSE_APP_URL}/login?redirect=${encodeURIComponent(
            escapedRedirectURI
          )}&machine_id=${encodeURIComponent(env.machineId)}`,
          true
        );

        console.log(uri.toString());
        console.log(uri.toJSON());

        await env.openExternal(uri);

        const { token } = (await Promise.race([
          new Promise((resolve) => {
            this.eventEmitter.event((event) => {
              if (event.requestId === requestId) {
                resolve({
                  token: event.token,
                });
              }
            });
          }),
          new Promise((_, reject) => {
            setTimeout(
              () => {
                reject(new Error("Timed out"));
              },
              2 * 60 * 1000
            );
          }),
        ])) as {
          token: string;
        };

        capture("login");

        const session = {
          id: "codemuse",
          accessToken: token,
          account: {
            label: "CodeMuse",
            id: "codemuse",
          },
          scopes: [],
        } satisfies AuthenticationSession;

        await this.context.secrets.store(
          SESSIONS_SECRET_KEY,
          JSON.stringify([session])
        );

        this.sessionChangeEmitter.fire({
          added: [session],
          removed: [],
          changed: [],
        });

        return session;
      }
    );
  }

  clearSessions = async (): Promise<void> => {
    const sessions = await this.getSessions();

    await this.context.secrets.delete(SESSIONS_SECRET_KEY);

    this.sessionChangeEmitter.fire({
      added: [],
      removed: sessions,
      changed: [],
    });
  };
}

export const getUser = async () => {
  const test = await authentication.getSession("codemuse", [], {
    createIfNone: true,
  });

  console.log(test);
};
