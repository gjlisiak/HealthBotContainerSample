const defaultLocale = 'en-US';
const params = new URLSearchParams(location.search);

function requestChatBot(loc) {   
    //const params = new URLSearchParams(location.search);
    const oReq = new XMLHttpRequest();
    oReq.addEventListener("load", initBotConversation);
    var path = "/chatBot?locale=" + extractLocale(params.get('locale'));

    if (loc) {
        path += "&lat=" + loc.lat + "&long=" + loc.long;
    }
    if (params.has('userId')) {
        path += "&userId=" + params.get('userId');
    }
    if (params.has('userName')) {
        path += "&userName=" + params.get('userName');
    }
    oReq.open("POST", path);
    oReq.send();
}

function extractLocale(localeParam) {
    if (!localeParam) {
        return defaultLocale;
    }
    else if (localeParam === 'autodetect') {
        return navigator.language;
    }
    else {
        return localeParam;
    }
}

function chatRequested() {
    //const params = new URLSearchParams(location.search);
    if (params.has('shareLocation')) {
        getUserLocation(requestChatBot);
    }
    else {
        requestChatBot();
    }
}

function getUserLocation(callback) {
    navigator.geolocation.getCurrentPosition(
        function(position) {
            var latitude  = position.coords.latitude;
            var longitude = position.coords.longitude;
            var location = {
                lat: latitude,
                long: longitude
            }
            callback(location);
        },
        function(error) {
            // user declined to share location
            console.log("location error:" + error.message);
            callback();
        });
}

function initBotConversation() {
    if (this.status >= 400) {
        alert(this.statusText);
        return;
    }
    // extract the data from the JWT
    const jsonWebToken = this.response;
    const tokenPayload = JSON.parse(atob(jsonWebToken.split('.')[1]));
    const user = {
        id: tokenPayload.userId,
        name: tokenPayload.userName,
        locale: tokenPayload.locale
    };
    let domain = undefined;
    if (tokenPayload.directLineURI) {
        domain =  "https://" +  tokenPayload.directLineURI + "/v3/directline";
    }
    let location = undefined;
    if (tokenPayload.location) {
        location = tokenPayload.location;
    } else {
        // set default location if desired
        location = {
            lat: 26.8595464,
            long: 80.9594193
        }
    }
    var botConnection = window.WebChat.createDirectLine({
        token: tokenPayload.connectorToken,
        domain: domain
    });
    const styleOptions = {
        //botAvatarImage: 'https://docs.microsoft.com/en-us/azure/bot-service/v4sdk/media/logo_bot.svg?view=azure-bot-service-4.0',
	//botAvatarImage: '/images/cel_logo.png',    
        // botAvatarInitials: '',
        // userAvatarImage: '',
        hideSendBox: false, /* set to true to hide the send box from the view */
        //botAvatarInitials: 'Bot',
        //userAvatarInitials: 'You',
        backgroundColor: '#F8F8F8'
    };

    const store = window.WebChat.createStore({}, function(store) { return function(next) { return function(action) {
        if (action.type === 'DIRECT_LINE/CONNECT_FULFILLED') {
            store.dispatch({
                type: 'DIRECT_LINE/POST_ACTIVITY',
                meta: {method: 'keyboard'},
                payload: {
                    activity: {
                        type: "invoke",
                        name: "InitConversation",
                        locale: user.locale,
                        value: {
                            // must use for authenticated conversation.
                            jsonWebToken: jsonWebToken,

                            // Use the following activity to proactively invoke a bot scenario
                            
                            triggeredScenario: {
                                trigger: "auth",
                                args: {
                                    location: location,
				    debug: params.has('debug')
                                }
                            }
                            
                        }
                    }
                }
            });

        }
        else if (action.type === 'DIRECT_LINE/INCOMING_ACTIVITY') {
            if (action.payload && action.payload.activity && action.payload.activity.type === "event" && action.payload.activity.name === "ShareLocationEvent") {
                // share
                getUserLocation(function (location) {
                    store.dispatch({
                        type: 'WEB_CHAT/SEND_POST_BACK',
                        payload: { value: JSON.stringify(location) }
                    });
                });
            }
        }
        return next(action);
    }}});
    const webchatOptions = {
        directLine: botConnection,
        styleOptions: styleOptions,
        store: store,
        userID: user.id,
        username: user.name,
        locale: user.locale
    };
    startChat(user, webchatOptions);
}

function startChat(user, webchatOptions) {
    const botContainer = document.getElementById('webchat');
    window.WebChat.renderWebChat(webchatOptions, botContainer);
}

/* Begin Added Logic for Disabling Prompts */

setInterval( function() {
	var ul = document.getElementById("webchat").getElementsByTagName("ul")[1];
	if (!ul) {
		return;
	}
	// Array.from(ul.getElementsByTagName('button'))
	// 	.filter(function(button) { return !button.classList.contains("touched")})
	// 	.forEach(function(button) {
	// 		// console.log("touching", button);
	// 		button.classList.add("touched");
	// 		button.addEventListener("click", disablePastButtonsAndInputs);
	// 	});
    ul.addEventListener("DOMNodeInserted", disablePastButtonsAndInputs);
}, 1000);

function disablePastButtonsAndInputs(e) {
        var uls = document.getElementById("webchat").getElementsByTagName("ul");
        var ul = uls[uls.length-1];
        this.classList.add("selected-button");
        Array.from(ul.getElementsByTagName('button'))
            // .filter(function(button) { return !button.hasAttribute("disabled")})
            .forEach(function(button) {
                // console.log('disabling', button);
                button.setAttribute("disabled", true);
                button.classList.add("past");
            });
        Array.from(ul.getElementsByTagName('input'))
            // .filter(function(input) { return !input.hasAttribute("disabled")})
            .forEach(function(input) {
                // console.log('disabling', input);
                input.setAttribute("disabled", true);
                input.classList.add("past");
            });
    
        Array.from(ul.getElementsByTagName('select'))
            // .filter(function(input) { return !input.hasAttribute("disabled")})
            .forEach(function(input) {
                // console.log('disabling', select);
                input.setAttribute("disabled", true);
                input.classList.add("past");
    
            });

        var activities = ul.getElementsByTagName("li");
        if(activities.length >0)
        {
            var last = activities[activities.length -1];
            Array.from(last.getElementsByTagName('button'))
            .forEach(function(button) {
                button.removeAttribute('disabled');
                button.classList.remove("past");
                });
    
            Array.from(last.getElementsByTagName('input'))
                .forEach(function(input) {
                    input.removeAttribute('disabled');
                    input.classList.remove("past");
                });
    
            Array.from(last.getElementsByTagName('select'))
                .forEach(function(input) {
                    input.removeAttribute('disabled');
                    input.classList.remove("past");
    
                });
        }
}
