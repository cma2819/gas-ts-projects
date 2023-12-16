import { Properties } from './gas';
import { Bid, Choice } from './sheet';

type TrackerSessions = {
    csrfToken: string;
    sessionId: string;
};

export const tracker = (trackerProps: Properties["tracker"]) => ({
    loginTracker: () => {
        const pickCookies = (headers: object): string[] => {
            if (typeof headers["Set-Cookie"] === "undefined") {
                return [];
            }
            // Set-Cookieヘッダーが2つ以上の場合はheaders['Set-Cookie']の中身は配列
            const cookies =
                typeof headers["Set-Cookie"] == "string"
                    ? [headers["Set-Cookie"]]
                    : headers["Set-Cookie"];
            for (let i = 0; i < cookies.length; i++) {
                // Set-Cookieヘッダーからname=valueだけ取り出し、セミコロン以降の属性は除外する
                cookies[i] = cookies[i].split(";")[0];
            }
            return cookies;
        };

        const pickCsrfMiddlewareToken = (res: GoogleAppsScript.URL_Fetch.HTTPResponse) => {
            const html = res.getContentText();
            const [, bodyCsrftoken] = html.match(/csrfmiddlewaretoken" value="(.+?)"/) ?? [];
            return bodyCsrftoken;
        };

        const fetchCsrfToken = () => {
            const response = UrlFetchApp.fetch(`${trackerProps.baseUrl}/admin/login/?next=/admin/`);
            const cookies = pickCookies(response.getAllHeaders());
            const bodyCsrfToken = pickCsrfMiddlewareToken(response);

            return {
                cookies,
                bodyCsrfToken,
            }
        };

        const login = (cookies: string[], bodyCsrfToken: string) => {
            const loginUrl = `${trackerProps.baseUrl}/admin/login/`
    
            const response = UrlFetchApp.fetch(loginUrl, {
                method: 'post',
                headers: {
                    // Accept: "*/*",
                    Referer: loginUrl,
                    Cookie: cookies.join(";"),
                },
                followRedirects: false,
                contentType: "application/x-www-form-urlencoded",
                payload: {
                    csrfmiddlewaretoken: bodyCsrfToken,
                    username: trackerProps.username,
                    password: trackerProps.password,
                    next: "/admin/",
                },
            });
            const headers2 = response.getAllHeaders();
            const newCookies = pickCookies(headers2);
    
            return {
                csrftoken: newCookies
                    .find((item) => item.includes("csrftoken"))
                    ?.replace("csrftoken=", ""),
                sessionId: newCookies
                    .find((item) => item.includes("sessionid"))
                    ?.replace("sessionid=", ""),
            };
        }

        const {cookies, bodyCsrfToken } = fetchCsrfToken();
        return login(cookies, bodyCsrfToken);
    },

    postBids: (bids: Bid[], sessions: TrackerSessions) => {
        const findBid = (bid: Bid): string | null => {
            const searchUrl = `${trackerProps.baseUrl}/api/v1/search/?type=bid&run=${bid.runPk}&name=${encodeURIComponent(bid.name)}`;

            const response = UrlFetchApp.fetch(searchUrl, {
                headers: {                    
                    "X-CSRFToken": sessions.csrfToken,
                    "csrftoken": sessions.csrfToken,
                    "Referer": `${trackerProps.baseUrl}/admin/tracker`,
                    "Cookie": `csrftoken=${sessions.csrfToken}; sessionid=${sessions.sessionId};`
                },
            });
            const data = JSON.parse(response.getContentText());

            const first = data[0];

            return first?.pk ?? null
        }

        const checkRunIsBackup = (runPk: string): boolean => {
            const searchUrl = `${trackerProps.baseUrl}/api/v1/search/?type=run&id=${runPk}`;

            const response = UrlFetchApp.fetch(searchUrl);
            const data = JSON.parse(response.getContentText());

            const first = data[0];

            if (!first) {
                throw new Error(`Run is not found:${runPk}`)
            }

            return first.fields['order'] === null;
        }

        const listBidTargets = (bidPk: string): string[] => {
            const searchUrl = `${trackerProps.baseUrl}/api/v1/search/?type=bidtarget&parent=${bidPk}`;

            const response = UrlFetchApp.fetch(searchUrl, {
                headers: {                    
                    "X-CSRFToken": sessions.csrfToken,
                    "csrftoken": sessions.csrfToken,
                    "Referer": `${trackerProps.baseUrl}/admin/tracker`,
                    "Cookie": `csrftoken=${sessions.csrfToken}; sessionid=${sessions.sessionId};`
                },
            });
            const data = JSON.parse(response.getContentText());

            return data?.map(d => d.pk) ?? []
        }

        const findAlreadyExistsChoice = (bidPk: string, name: string) => {
            const searchUrl = `${trackerProps.baseUrl}/api/v1/search/?type=bidtarget&parent=${bidPk}&name=${encodeURIComponent(name)}`;

            const response = UrlFetchApp.fetch(searchUrl, {
                headers: {                    
                    "X-CSRFToken": sessions.csrfToken,
                    "csrftoken": sessions.csrfToken,
                    "Referer": `${trackerProps.baseUrl}/admin/tracker`,
                    "Cookie": `csrftoken=${sessions.csrfToken}; sessionid=${sessions.sessionId};`
                },
            });
            const data = JSON.parse(response.getContentText());

            const first = data[0];

            return first?.pk ?? null
        }

        type Payload = {[k: string]: string};

        const makeBidProps = (bid: Bid): Payload => ({
            type: 'bid',
            speedrun: bid.runPk,
            name: bid.name,
            description: bid.description,
            shortdescription: bid.short,
            state: 'HIDDEN',
            ... (bid.type === 'choice' ? {
                istarget: 'False',
                allowuseroptions: bid.allowedUserOptions ? 'True' : 'False',
            } : {}),
            ... (bid.type === 'challenge' ? {
                istarget: 'True',
            } : {}),
        })

        const makeBidTargetProps = (choice: Choice, bidPk: string): Payload => ({
            type: 'bidtarget',
            istarget: 'True',
            state: 'OPENED',
            parent: bidPk,
            name: choice.name,
            description: choice.description,
        })

        const editModel = (payload: Payload, pk: string, {csrfToken, sessionId}: TrackerSessions): string => {
            const editUrl = `${trackerProps.baseUrl}/api/v1/edit/`;

            const response = UrlFetchApp.fetch(editUrl, {
                method: 'post',
                headers: {                    
                    "X-CSRFToken": csrfToken,
                    "csrftoken": csrfToken,
                    "Referer": `${trackerProps.baseUrl}/admin/tracker`,
                    "Cookie": `csrftoken=${csrfToken}; sessionid=${sessionId};`
                },
                contentType: "application/x-www-form-urlencoded",
                payload: {
                    ...payload,
                    id: pk,
                },
            });

            if (response.getResponseCode() > 299) {
                Logger.log(payload);
                Logger.log(response.getContentText());
            }
            const data = JSON.parse(response.getContentText());
            const first = data[0];
            if (response.getResponseCode() > 299 || !first ) {
                throw new Error(response.getContentText());
            }
            return first['pk'];
        }

        const addModel = (payload: Payload, {csrfToken, sessionId}: TrackerSessions): string => {
            const addUrl = `${trackerProps.baseUrl}/api/v1/add/`;
            
            const response = UrlFetchApp.fetch(addUrl, {
                method: 'post',
                headers: {                    
                    "X-CSRFToken": csrfToken,
                    "csrftoken": csrfToken,
                    "Referer": `${trackerProps.baseUrl}/admin/tracker`,
                    "Cookie": `csrftoken=${csrfToken}; sessionid=${sessionId};`
                },
                contentType: "application/x-www-form-urlencoded",
                payload,
                muteHttpExceptions: true,
            });

            if (response.getResponseCode() > 299) {
                Logger.log(payload);
                Logger.log(response.getContentText());
            }
            const data = JSON.parse(response.getContentText());
            const first = data[0];
            if (response.getResponseCode() > 299 || !first ) {
                throw new Error(response.getContentText());
            }
            return first['pk'];
        }

        const deleteModel = (type: string, pk: string, {csrfToken, sessionId}: TrackerSessions) => {
            const deleteUrl = `${trackerProps.baseUrl}/api/v1/delete/`;

            const response = UrlFetchApp.fetch(deleteUrl, {
                method: 'post',
                headers: {                    
                    "X-CSRFToken": csrfToken,
                    "csrftoken": csrfToken,
                    "Referer": `${trackerProps.baseUrl}/admin/tracker`,
                    "Cookie": `csrftoken=${csrfToken}; sessionid=${sessionId};`
                },
                contentType: "application/x-www-form-urlencoded",
                payload: {
                    type,
                    id: pk
                },
            });
        }

        for (const bid of bids) {
            const payload = makeBidProps(bid);
            const existsBidPk = findBid(bid);
            const bidPk = existsBidPk ? editModel(payload, Number(existsBidPk).toFixed(), sessions) : addModel(payload, sessions);

            if (bid.type === 'choice') {
                const existsBidTargetPks = listBidTargets(bidPk);

                for (const idx in bid.choices) {
                    const c = bid.choices[idx];
                    const existsPk = findAlreadyExistsChoice(bidPk, c.name);
                    const payload = makeBidTargetProps(c, Number(bidPk).toFixed());

                    existsPk ? editModel(payload, Number(existsPk).toFixed(), sessions) : addModel(payload, sessions);
                }

                if (existsBidTargetPks.length > bid.choices.length) {
                    const restExistsTargetPks = existsBidTargetPks.slice(-1 * (existsBidTargetPks.length - bid.choices.length));

                    for (const deletePk of restExistsTargetPks) {
                        deleteModel('bidtarget', Number(deletePk).toFixed(), sessions);
                    }
                }
            }
            Utilities.sleep(500);
            Logger.log(`Done to update bid ${JSON.stringify(bid)}`)
        }
    }
});
