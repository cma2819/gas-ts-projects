const BIDS_SHEET_NAME = '投票選考';

type BidGeneral = {
    runPk: string;
    name: string;
    description: string;
    short: string;
}

type Choice = {
    name: string;
    description: string;
}

type ChoiceBid = {
    type: 'choice',
    choices: Choice[],
    allowedUserOptions: boolean,
}

type ChallengeBid = {
    type: 'challenge',
    target: number,
}

type Bid = (ChoiceBid | ChallengeBid) & BidGeneral

const itemLabelToRunPk = (label: string): string => {
    const splitted = label.split(' - ');
    const [last] = splitted.slice(-1);

    return last;
}

const rowsToBids = (rows: any[][]): Bid[] => {
    return rows.filter(([_, __, accepted]) => accepted)
        .map(([itemLabel, _d, _a, target, choiceNames, choiceDescriptions, allowedUserOptions, name, description, short]) => {
            if (target) {
                return {
                    type: 'challenge',
                    runPk: itemLabelToRunPk(itemLabel),
                    name,
                    description,
                    short,
                    target,
                }
            }
            const choices: Choice[] = choiceNames.split('\n').filter(s => s !== '').map((name, idx) => ({
                name,
                description: choiceDescriptions?.[idx] ?? ''
            }));
            return {
                type: 'choice',
                runPk: itemLabelToRunPk(itemLabel),
                name,
                description,
                short,
                choices,
                allowedUserOptions
            }
        })
}

const loadBidsFromSheet = () => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BIDS_SHEET_NAME);

    if (!sheet) {
        throw new Error(`Bids sheet is not found. it should be named as ${BIDS_SHEET_NAME}`);
    }

    const rangeValues = sheet.getRange('A3:J').getValues();
    const bids = rowsToBids(rangeValues);

    return bids;
}