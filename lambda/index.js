// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const axios = require('axios');
// const http = require('http');

// For predictions
const basePredictionURL =
    'http://webservices.nextbus.com/service/publicJSONFeed?command=predictions&a=sf-muni';

// Test route for predictions
// http://webservices.nextbus.com/service/publicJSONFeed?command=predictions&a=sf-muni&stopId=15552&routeTag=14

// For individual Routes
const baseRouteURL =
    'http://webservices.nextbus.com/service/publicJSONFeed?command=routeConfig&a=sf-muni';

// Example individual route URL
// http://webservices.nextbus.com/service/publicJSONFeed?command=routeConfig&a=sf-muni&r=14

// Returns a list of all bus lines
const RouteListURL =
    'http://webservices.nextbus.com/service/publicJSONFeed?command=routeList&a=sf-muni';

// ------------------ Alexa code -----------------------------

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
            'LaunchRequest'
        );
    },
    handle(handlerInput) {
        const speakOutput =
            'Hello! give me a bus tag, stop name, and direction and I will find out the prediction times.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    },
};

const NextMuniIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
                'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) ===
                'NextMuniIntent'
        );
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope } = handlerInput;

        const busTag = Alexa.getSlotValue(requestEnvelope, 'bus');
        const direction = Alexa.getSlotValue(requestEnvelope, 'direction');
        const stopName = Alexa.getSlotValue(requestEnvelope, 'stopName');

        const desiredStopTag = await findStopTag(
            busTag,
            patchInput(direction),
            patchInput(stopName)
        );

        const speakOutput = await findPredictionByStopTag(
            busTag,
            desiredStopTag
        );

        return (
            handlerInput.responseBuilder
                .speak(speakOutput)
                //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
                .getResponse()
        );
    },
};

// ------------------ Functionality --------------------------

const findPredictionByStopTag = async (bus, stopTag) => {
    const predictionURL = basePredictionURL + '&r=' + bus + '&s=' + stopTag;
    let resultStr;

    try {
        const res = await axios.get(predictionURL);
        let data = res.data;
        let predictions = data.predictions.direction.prediction;

        if (predictions.length == 1) {
            resultStr =
                'Arrival times at ' +
                patchOutput(data.predictions.stopTitle) +
                ' There is a bus coming in ' +
                predictions[0].minutes +
                ' minutes.';
        } else {
            resultStr =
                'Arrival times at  ' +
                patchOutput(data.predictions.stopTitle) +
                ' Bus coming in ' +
                predictions[0].minutes +
                ' minutes and ' +
                predictions[1].minutes +
                ' minutes';
        }
        return resultStr;
    } catch (err) {
        console.error(err);
        return 'There are currently no incoming buses or there is an error with your request';
    }
};

const findStopTag = async (bus, direction, stopName) => {
    const infoURL = baseRouteURL + '&r=' + bus;
    try {
        const res = await axios.get(infoURL);
        const data = res.data;

        const routeData = data.route;
        const routeStops = routeData.stop;

        let stopsInGivenDirection;

        for (let i = 0; i < routeData.direction.length; i++) {
            if (routeData.direction[i].name === direction) {
                stopsInGivenDirection = routeData.direction[i].stop;
            }
        }

        // There are two different stops that share the same name but going in different directions
        let stopTags = [];

        for (let i = 0; i < routeStops.length; i++) {
            {
                if (routeStops[i].title === stopName) {
                    stopTags.push(routeStops[i].tag);
                }
            }
        }

        let desiredStopTag;

        for (let i = 0; i < stopTags.length; i++) {
            for (let j = 0; j < stopsInGivenDirection.length; j++) {
                if (stopsInGivenDirection[j].tag === stopTags[i]) {
                    desiredStopTag = stopTags[i];
                }
            }
        }

        return desiredStopTag;
    } catch (err) {
        console.error(err);
        return 'Failed due to invalid bus or stop name from your request';
    }
};

const patchInput = (input) => {
    let words = input.trim().split(' ');
    for (let i = 0; i < words.length; i++) {
        let word = words[i].toLowerCase();
        console.log(word);
        if (word === 'street') {
            words[i] = 'St';
        } else if (word === 'avenue') {
            words[i] = 'Ave';
        } else if (word === 'and') {
            words[i] = '&';
        } else {
            words[i] = word.charAt(0).toUpperCase() + word.slice(1);
        }
    }
    return words.join(' ');
};

const patchOutput = (output) => {
    let words = output.trim().split(' ');
    for (let i = 0; i < words.length; i++) {
        if (words[i] === 'St') {
            words[i] = 'Street';
        }
        if (words[i] === '&') {
            words[i] = 'and';
        }
    }
    return words.join(' ');
    // let newInput = input.replace(/st/gi, "street")
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
                'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) ===
                'AMAZON.HelpIntent'
        );
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    },
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
                'IntentRequest' &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) ===
                'AMAZON.CancelIntent' ||
                Alexa.getIntentName(handlerInput.requestEnvelope) ===
                    'AMAZON.StopIntent')
        );
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    },
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
            'SessionEndedRequest'
        );
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    },
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) ===
            'IntentRequest'
        );
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return (
            handlerInput.responseBuilder
                .speak(speakOutput)
                //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
                .getResponse()
        );
    },
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    },
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        NextMuniIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();
