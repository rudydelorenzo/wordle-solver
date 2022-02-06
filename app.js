import * as fs from 'fs'
import figlet from 'figlet';
import gradient from 'gradient-string';
import prompt from 'prompt';

const debug = true;
const wordLength = 5;

let wordList = fs.readFileSync("wlist_match11.txt", 'utf8').split("\n").filter(word => word.length === wordLength).map(word => word.toUpperCase());
let lettersMisplaced = {}; // {A: [], B: [], C: [], ...} Letter followed by places where it ISNT
let lettersEliminated = []; // [A, B, C, D, ...]
let lettersPlaced = {}; // {A: 0, O: 2, ...}

await printTitle("Welcome to Emir");

while (true) {
    let {bestWord, bestScore, totalScore} = suggestWord();

    if (bestWord === "") {
        await printLoss("OUT OF WORDS !");
        process.exit(0);
    }

    console.log(figlet.textSync(bestWord, {
        horizontalLayout: 'fitted'
    }));
    console.log(`${bestWord} (${((bestScore/totalScore)*100).toFixed(2)}% confidence)`);


    prompt.start();
    let {feedback} = await prompt.get([{
        name: 'feedback',
        required: true,
        pattern: RegExp(`((?=\\b\\w{${wordLength}}\\b)([nygNYG][nygNYG][nygNYG][nygNYG][nygNYG]))|nope|NOPE`)
    }]);

    feedback = feedback.toUpperCase();

    if (feedback === "GGGGG") {
        // Game over!
        await printWin("WE WON !");
        process.exit(0);
    }

    if (feedback === "NOPE") {
        let idx = wordList.indexOf(bestWord);
        if (idx !== -1) wordList.splice(idx, 1);
        continue
    }

    for (let i in bestWord) {
        let color = feedback[i];
        let letter = bestWord[i];
        if (color === "N") {
            lettersEliminated.push(letter);
            lettersEliminated = [...new Set(lettersEliminated)];
        } else if (color === "Y") {
            if (!lettersMisplaced[letter]) {
                lettersMisplaced[letter] = [];
            }
            lettersMisplaced[letter].push(Number(i));
            lettersMisplaced[letter] = [...new Set(lettersMisplaced[letter])];
        } else {
            lettersPlaced[letter] = Number(i);
        }
    }

}

async function printTitle(text) {
    return new Promise(((resolve) => {
        figlet.text(text, {
            horizontalLayout: 'fitted'
        }, function (err, data) {
            resolve(console.log(gradient.instagram(data)));
        });
    }))
}

async function printWin(text) {
    return new Promise(((resolve) => {
        figlet.text(text, {
            horizontalLayout: 'fitted'
        }, function (err, data) {
            resolve(console.log(gradient.pastel(data)));
        });
    }))
}

async function printLoss(text) {
    return new Promise(((resolve) => {
        figlet.text(text, {
            horizontalLayout: 'fitted'
        }, function (err, data) {
            resolve(console.log(gradient.passion(data)));
        });
    }))
}



function suggestWord() {
    let regexElimination = Array(wordLength).fill([]);
    for (let i = 0; i < wordLength; i++) {
        let unavailLetters = []
        for (let letter in lettersMisplaced) {
            if (lettersMisplaced[letter].includes(i)) unavailLetters.push(letter);
        }
        for (let letter of lettersEliminated) {
            unavailLetters.push(letter);
        }
        regexElimination[i] = unavailLetters
    }

    let regexString = "";
    mainLoop:
    for (let i = 0; i < wordLength; i++) {
        for (let letter in lettersPlaced) {
            if (lettersPlaced[letter] === i) {
                regexString = regexString.concat(letter);
                continue mainLoop;
            }
        }

        if (regexElimination[i].length !== 0) {
            let negated = "[^";
            for (let l in regexElimination[i]) {
                negated = negated.concat(regexElimination[i][l]);
            }
            negated = negated.concat("]");
            regexString = regexString.concat(negated);
        } else {
            regexString = regexString.concat(".");
        }
    }

    if (debug) console.log(`REGEX: ${regexString}`);

    let regex = RegExp(regexString);

    // remove most implausible words
    wordList = wordList.filter(word => word.match(regex));

    // perky optimization (remove words that dont have all the yellow letters)
    for (let letter in lettersMisplaced) {
        wordList = wordList.filter(word => word.includes(letter));
    }

    if (debug) console.log(wordList);

    // calculate most common letters
    let counts = {};
    for (let word of wordList) {
        for (let i = 0; i < word.length; i++) {
            let key = word[i];
            if (!counts[key]) {
                counts[key] = 0;
            }
            if (!(i === word.length-1 && key === "S")) counts[key]++;
        }
    }

    // calculate word scores, return highest
    let bestWord = "";
    let bestScore = 0;
    let totalScore = 0;
    for (let word of wordList) {
        let wordScore = 0;
        let wordSet = [...new Set(word)]
        for (let i = 0; i < wordSet.length; i++) {
            wordScore += counts[wordSet[i]];
            totalScore += counts[wordSet[i]];
        }
        // point subtractions for s and ing terminations
        if (word.match(/(\w*s\b)|(\w*ing\b)/)) wordScore *= 0.75;
        if (wordScore > bestScore) {
            bestWord = word;
            bestScore = wordScore;
        }
    }

    return {bestWord, bestScore, totalScore};

}