const { RegExpMatcher, TextCensor, DataSet, pattern } = require('obscenity');

const dataset = new DataSet()
	.addPhrase((phrase) =>
		phrase
			.setMetadata({ originalWord: 'faggot' })
			.addPattern(pattern`faggot`)
			.addPattern(pattern`fag`),
	)
	.addPhrase((phrase) =>
		phrase
			.setMetadata({ originalWord: 'penis' })
			.addPattern(pattern`penis`),
	)
	.addPhrase((phrase) =>
		phrase
			.setMetadata({ originalWord: 'penis' })
			.addPattern(pattern`penis`)
            .addPattern(pattern`dick`)
            .addPattern(pattern`cock`),
	)
	.addPhrase((phrase) =>
		phrase
			.setMetadata({ originalWord: 'breasts' })
            .addPattern(pattern`breasts`)
			.addPattern(pattern`tits`)
            .addPattern(pattern`titties`)
            .addPattern(pattern`boobs`),
	)
	.addPhrase((phrase) =>
		phrase
			.setMetadata({ originalWord: 'sex' })
			.addPattern(pattern`sex`),
	)
	.addPhrase((phrase) =>
		phrase
			.setMetadata({ originalWord: 'porn' })
			.addPattern(pattern`porn`),
	)
	.addPhrase((phrase) =>
		phrase
			.setMetadata({ originalWord: 'vagina'})
			.addPattern(pattern`vagina`)
			.addPattern(pattern`vag`)
			.addPattern(pattern`pussy`)
	)

function censor(text) {
    const matcher = new RegExpMatcher({ ...dataset.build() });
    const censor = new TextCensor();
    const matches = matcher.getAllMatches(text);
    const result = censor.applyTo(text, matches);
    return result;
}

module.exports = censor