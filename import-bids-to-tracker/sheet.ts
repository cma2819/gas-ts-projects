const BIDS_SHEET_NAME = '投票選考';

export type BidGeneral = {
    runPk: string;
    name: string;
    description: string;
    short: string;
}

export type Choice = {
    name: string;
    description: string;
}

export type ChoiceBid = {
    type: 'choice',
    choices: Choice[],
    allowedUserOptions: boolean,
}

export type ChallengeBid = {
    type: 'challenge',
}

export type Bid = (ChoiceBid | ChallengeBid) & BidGeneral

const itemLabelToRunPk = (label: string): string => {
    const splitted = label.split(' - ');
    const [last] = splitted.slice(-1);

    return last;
}

const rowsToBids = (rows: any[][]): Bid[] => {
    return rows.filter(([_, __, type]) => type && (type !== '不採用'))
        .map(([itemLabel, _d, type, _t, choiceNames, choiceDescriptions, name, description, short]) => {
            if (type === '目標額') {
                return {
                    type: 'challenge',
                    runPk: itemLabelToRunPk(itemLabel),
                    name,
                    description,
                    short,
                }
            }
            if (['自由入力', '選択肢'].includes(type)) {
                const choiceDescs: string[] = choiceDescriptions.split('\n');
                const choices: Choice[] = choiceNames.split('\n').filter(s => s !== '').map((name, idx) => ({
                    name,
                    description: choiceDescs?.[idx] ?? '',
                }));
                return {
                    type: 'choice',
                    runPk: itemLabelToRunPk(itemLabel),
                    name,
                    description,
                    short,
                    choices,
                    allowedUserOptions: type === '自由入力'
                }
            }
            throw new Error(`Unexpected type ${type} received!`);
        })
}

export const loadBidsFromSheet = () => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BIDS_SHEET_NAME);

    if (!sheet) {
        throw new Error(`Bids sheet is not found. it should be named as ${BIDS_SHEET_NAME}`);
    }

    const rangeValues = sheet.getRange('A3:J').getValues();
    const bids = rowsToBids(rangeValues);

    return bids;
}