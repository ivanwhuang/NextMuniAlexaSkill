const axios = require('axios');

// For predictions
const basePredictionURL =
    'http://webservices.nextbus.com/service/publicJSONFeed?command=predictions&a=sf-muni';

// example prediction
// http://webservices.nextbus.com/service/publicJSONFeed?command=predictions&a=sf-muni&r=14&s=5552

// For individual Routes
const baseRouteURL =
    'http://webservices.nextbus.com/service/publicJSONFeed?command=routeConfig&a=sf-muni';

// Example individual route URL
// http://webservices.nextbus.com/service/publicJSONFeed?command=routeConfig&a=sf-muni&r=14

// Returns a list of all bus lines
const RouteListURL =
    'http://webservices.nextbus.com/service/publicJSONFeed?command=routeList&a=sf-muni';

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
                'Arrival times at stop ' +
                patchOutput(data.predictions.stopTitle) +
                '. There is a bus coming in ' +
                predictions[0].minutes +
                ' minutes.';
        } else {
            resultStr =
                'Arrival times at stop ' +
                patchOutput(data.predictions.stopTitle) +
                '. Bus coming in ' +
                predictions[0].minutes +
                ' minutes and ' +
                predictions[1].minutes +
                ' minutes';
        }
        return resultStr;
    } catch (err) {
        console.error(err);
        return 'There are currently no incoming buses or there is an error';
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
        if (words[i] === '&') {
            words[i] = 'and';
        }
    }
    return words.join(' ');
};

// direction needs to be capitalized

// findPredictionByStopTag('14', '5552');

const main = async () => {
    let desiredStopTag = await findStopTag(
        '14',
        'Inbound',
        'Mission St & 16th St'
    );
    let result = await findPredictionByStopTag('14', desiredStopTag);
    console.log(result);
};

// main();

console.log(patchInput('mission and 16th street'));
console.log(patchInput('inbound'));
