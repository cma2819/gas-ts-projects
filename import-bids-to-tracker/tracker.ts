type TrackerSessions = {
    csrfToken: string;
    sessionId: string;
};

const tracker = (trackerProps: Properties["tracker"]) => ({
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

    updateBids: (bids: Bid[], {csrfToken, sessionId}: TrackerSessions) => {
        
    }
});
