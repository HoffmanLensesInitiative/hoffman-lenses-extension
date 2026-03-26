/**
 * hl-detect v0.1.0
 * Hoffman Lenses Initiative -- https://hoffmanlenses.org
 *
 * Linguistic manipulation pattern detection library.
 * Takes text as input. Returns structured analysis.
 * Platform-agnostic. DOM-agnostic. No dependencies.
 *
 * License: MIT
 */

(function(root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    root.hlDetect = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {

  var VERSION = '0.1.0';

  var PATTERNS = [

    {
      id: 'suppression_framing',
      severity: 'danger',
      label: 'Suppression framing',
      explanation: 'This content claims it is being suppressed or hidden by powerful forces. This framing is designed to make you feel you are accessing forbidden truth -- bypassing your skepticism in the process. Legitimate information does not need to warn you that it is being censored.',
      test: function(text) {
        var t = text.toLowerCase();
        var regexes = [
          /they\s+don'?t\s+want\s+you\s+to\s+(see|know|share|watch|read)/,
          /before\s+(this\s+gets?|it\s+gets?|they)\s+(deleted?|removed?|taken\s+down|censored)/,
          /share\s+before\s+(it'?s?|this\s+(gets?|is))\s+(deleted?|removed?|gone|taken\s+down)/,
          /watch\s+before\s+(it'?s?|this)\s+(deleted?|removed?|gone|taken\s+down|disappears?)/,
          /what\s+(the\s+)?(mainstream\s+media|media|mainstream|msm|press)\s+(won'?t|isn'?t|refuses?\s+to)\s+(tell|show|cover|report)/,
          /(government|big\s+(pharma|tech|media))\s+(doesn'?t|don'?t)\s+want\s+you\s+to\s+know/,
          /the\s+(post|video|content|truth)\s+(they|facebook|instagram|twitter|tiktok|youtube|google)\s+tried\s+to\s+(delete|remove|ban|censor)/,
          /won'?t\s+(see|find|hear)\s+this\s+(on|in)\s+the\s+(news|media|mainstream)/
        ];
        var evidence = [];
        regexes.forEach(function(r) { var m = t.match(r); if (m) evidence.push(m[0]); });
        return { matched: evidence.length > 0, evidence: evidence };
      }
    },

    {
      id: 'false_urgency',
      severity: 'warn',
      label: 'False urgency',
      explanation: 'This content creates artificial time pressure -- implying you must act immediately or miss out. This technique bypasses careful thinking by triggering anxiety about loss. Genuine important information does not expire in the next few minutes.',
      test: function(text) {
        var t = text.toLowerCase();
        var regexes = [
          /only\s+\d+\s+(left|remaining|available|spots?|seats?|items?)/,
          /(offer|deal|sale|price)\s+(expires?|ends?)\s+(tonight|today|soon|midnight)/,
          /limited\s+time\s+(offer|only|deal)/,
          /\bact\s+now\b/,
          /\blast\s+chance\b/,
          /\btoday\s+only\b/,
          /\bdon'?t\s+wait\b/,
          /before\s+it'?s?\s+too\s+late/,
          /(selling|going)\s+fast/,
          /\balmost\s+gone\b/,
          /expires?\s+in\s+\d+\s+(hours?|minutes?|days?)/
        ];
        var evidence = [];
        regexes.forEach(function(r) { var m = t.match(r); if (m) evidence.push(m[0]); });
        return { matched: evidence.length > 0, evidence: evidence };
      }
    },

    {
      id: 'incomplete_hook',
      severity: 'warn',
      label: 'Incomplete hook',
      explanation: 'This headline deliberately withholds information to compel you to click or keep reading. There is no reason the information could not be stated directly -- it is withheld by design. This technique generates engagement data for the platform, not understanding for you.',
      test: function(text) {
        var t = text.toLowerCase();
        var regexes = [
          /you\s+won'?t\s+believe/,
          /what\s+happened\s+next/,
          /the\s+reason\s+(will|that)\s+(shock|surprise|amaze|horrify|blow)/,
          /\bfind\s+out\s+(why|what|how|who)\b(?!\s+wrong|\s+much|\s+well|\s+long|\s+many|\s+far|\s+good|\s+bad|\s+little|\s+big)/,
          /\bchanges\s+everything\b/,
          /nobody\s+(expected|saw\s+this\s+coming|is\s+talking\s+about\s+this)/,
          /the\s+(truth|secret|real\s+reason|shocking\s+truth)\s+about/,
          /\bwhat\s+really\s+happened\b/,
          /\byou\s+need\s+to\s+see\s+this\b/,
          /(jaw[\s-]?dropping|mind[\s-]?blowing)/
        ];
        var evidence = [];
        regexes.forEach(function(r) { var m = t.match(r); if (m) evidence.push(m[0]); });
        return { matched: evidence.length > 0, evidence: evidence };
      }
    },

    {
      id: 'outrage_engineering',
      severity: 'danger',
      label: 'Outrage engineering',
      explanation: 'This content uses language calibrated to produce outrage rather than inform. Emotional intensifiers and extreme characterizations are stacked to trigger a visceral response. Strong emotional reactions generate engagement metrics -- which is the real purpose of this language.',
      test: function(text) {
        var t = text.toLowerCase();
        var evidence = [];
        var intensifiers = ['absolutely','completely','utterly','totally','deeply','truly','profoundly','insanely'];
        var targets = ['disgusting','outrageous','unacceptable','shameful','horrifying','appalling','despicable','disgraceful','inexcusable','reprehensible'];
        intensifiers.forEach(function(intensifier) {
          targets.forEach(function(target) {
            var r = new RegExp(intensifier + '\\s+' + target);
            if (r.test(t)) evidence.push(intensifier + ' ' + target);
          });
        });
        var regexes = [
          /everyone\s+is\s+(furious|outraged|shocked|disgusted|angry)/,
          /people\s+are\s+(furious|outraged|shocked|disgusted|losing\s+their\s+minds?)/,
          /(twitter|the\s+internet|social\s+media)\s+is\s+(exploding|losing\s+it|on\s+fire|going\s+crazy)/,
          /(worst|most\s+corrupt|most\s+dangerous|most\s+evil)\s+(ever|in\s+history|of\s+all\s+time)/,
          /(destroy|destroying|ruining|killing)\s+(our|the)\s+(country|nation|democracy|children|future|way\s+of\s+life)/
        ];
        regexes.forEach(function(r) { var m = t.match(r); if (m) evidence.push(m[0]); });
        return { matched: evidence.length > 0, evidence: evidence };
      }
    },

    {
      id: 'false_authority',
      severity: 'warn',
      label: 'Unnamed authority',
      explanation: 'This content invokes authority without identifying it. Claims like "studies show" or "experts say" cannot be evaluated without knowing which studies or which experts. Legitimate authority identifies itself and can be verified.',
      test: function(text) {
        var t = text.toLowerCase();
        var regexes = [
          /\bstudies\s+show\b/,
          /\bexperts?\s+(say|warn|agree|confirm|reveal)\b/,
          /\bresearch\s+(proves?|shows?|confirms?|suggests?)\b/,
          /\bscientists?\s+(agree|confirm|say|warn)\b/,
          /\bdoctors?\s+(recommend|say|warn|confirm)\b/,
          /it\s+(has\s+been|is)\s+(proven|established|confirmed|shown)\s+that/,
          /\bit'?s\s+a\s+fact\s+that\b/,
          /\bas\s+we\s+all\s+know\b/,
          /\beveryone\s+knows\s+that\b/,
          /\bthe\s+science\s+is\s+(clear|settled)\b/
        ];
        var evidence = [];
        regexes.forEach(function(r) { var m = t.match(r); if (m) evidence.push(m[0]); });
        // Remove false positives where authority IS named
        // (e.g. "studies show" preceded by "Harvard" or specific citation)
        evidence = evidence.filter(function(e) {
          var idx = t.indexOf(e);
          var context = t.substring(Math.max(0, idx - 30), idx);
          var namedAuthority = /(harvard|oxford|cdc|who|nih|published|according\s+to\s+[a-z]+\s+[a-z]+)/.test(context);
          return !namedAuthority;
        });
        return { matched: evidence.length > 0, evidence: evidence };
      }
    },

    {
      id: 'tribal_activation',
      severity: 'warn',
      label: 'Tribal identity activation',
      explanation: 'This content signals group identity rather than making an argument. It implies that accepting this claim is what members of your tribe do -- and that rejecting it means you do not belong. This bypasses evaluation of the actual claim by making acceptance a matter of identity.',
      test: function(text) {
        var t = text.toLowerCase();
        var regexes = [
          /real\s+(americans?|patriots?|christians?|conservatives?|liberals?)\s+(know|understand|see|get)/,
          /true\s+(patriots?|believers?|americans?|christians?)\s+(know|understand|see|get|would)/,
          /if\s+you\s+(care\s+about|love|support|believe\s+in)\s+(your\s+(family|children|country|freedom))/,
          /\bwake\s+up\b.*\b(people|america|sheeple|world)\b/,
          /\bsheeple\b/,
          /\bopen\s+your\s+eyes\b/,
          /\bstill\s+asleep\b/,
          /those\s+of\s+us\s+who\s+(know|see|understand)/,
          /you'?ve\s+been\s+(lied\s+to|deceived|brainwashed)\s+(your\s+whole\s+life|by\s+the\s+(media|government|system))/,
          /\bdon'?t\s+be\s+a\s+sheep\b/
        ];
        var evidence = [];
        regexes.forEach(function(r) { var m = t.match(r); if (m) evidence.push(m[0]); });
        return { matched: evidence.length > 0, evidence: evidence };
      }
    },

    {
      id: 'engagement_directive',
      severity: 'warn',
      label: 'Engagement directive',
      explanation: 'This content contains explicit instructions to share, like, or comment -- designed to generate platform engagement metrics rather than communicate. These directives treat you as an amplification mechanism rather than a reader.',
      test: function(text) {
        var t = text.toLowerCase();
        var regexes = [
          /(share|repost|retweet|rt)\s+(this|if\s+you|to\s+(spread|save|help|warn))/,
          /share\s+(with\s+everyone|before|this\s+(post|video|truth))/,
          /if\s+you\s+agree\s+(share|like|comment|hit)/,
          /\blike\s+if\s+you\b/,
          /tag\s+(someone|a\s+friend|everyone)\s+who/,
          /spread\s+(the\s+)?(word|truth|news|awareness)/,
          /(hit|smash|click)\s+the\s+(like|share|follow)\s+button/
        ];
        var evidence = [];
        regexes.forEach(function(r) { var m = t.match(r); if (m) evidence.push(m[0]); });
        return { matched: evidence.length > 0, evidence: evidence };
      }
    }

  ];

  function calculateConfidence(patternId, evidenceCount, textLength) {
    var base = Math.min(0.95, 0.65 + (evidenceCount * 0.1));
    if (textLength < 15) base = base * 0.7;
    else if (textLength < 40) base = base * 0.9;
    return Math.round(base * 100) / 100;
  }

  function calculateEscalationScore(findings) {
    if (findings.length === 0) return 0;
    var weights = { danger: 30, warn: 15, info: 5 };
    var total = findings.reduce(function(sum, f) {
      return sum + (weights[f.severity] || 0) * f.confidence;
    }, 0);
    return Math.min(100, Math.round(total));
  }

  function hlDetect(text, options) {
    var start = Date.now();
    options = options || {};
    var minConfidence = options.minConfidence !== undefined ? options.minConfidence : 0.6;
    var explain = options.explain !== undefined ? options.explain : true;

    if (!text || typeof text !== 'string') {
      return {
        text: text || '',
        flagged: false,
        patternCount: 0,
        dominantPattern: null,
        escalationScore: 0,
        patterns: [],
        metadata: { processingTimeMs: Date.now() - start, textLength: 0, version: VERSION }
      };
    }

    var findings = [];
    PATTERNS.forEach(function(pattern) {
      var result = pattern.test(text);
      if (result.matched) {
        var confidence = calculateConfidence(pattern.id, result.evidence.length, text.length);
        if (confidence >= minConfidence) {
          var finding = {
            type: pattern.id,
            severity: pattern.severity,
            label: pattern.label,
            confidence: confidence,
            evidence: result.evidence
          };
          if (explain) finding.explanation = pattern.explanation;
          findings.push(finding);
        }
      }
    });

    findings.sort(function(a, b) { return b.confidence - a.confidence; });

    return {
      text: text,
      flagged: findings.length > 0,
      patternCount: findings.length,
      dominantPattern: findings.length > 0 ? findings[0].type : null,
      escalationScore: calculateEscalationScore(findings),
      patterns: findings,
      metadata: {
        processingTimeMs: Date.now() - start,
        textLength: text.length,
        version: VERSION
      }
    };
  }

  function hlDetectBatch(texts, options) {
    if (!Array.isArray(texts)) return [];
    return texts.map(function(text) { return hlDetect(text, options); });
  }

  function detectEscalationTrend(scores) {
    if (scores.length < 3) return 'insufficient_data';
    var third = Math.floor(scores.length / 3);
    var avgFirst = scores.slice(0, third).reduce(function(a,b){return a+b;},0) / third;
    var avgLast = scores.slice(scores.length - third).reduce(function(a,b){return a+b;},0) / third;
    var delta = avgLast - avgFirst;
    if (delta > 20) return 'escalating';
    if (delta < -20) return 'de-escalating';
    return 'stable';
  }

  function hlDetectSession(texts, options) {
    if (!Array.isArray(texts) || texts.length === 0) return null;
    var results = hlDetectBatch(texts, options);
    var flaggedCount = results.filter(function(r) { return r.flagged; }).length;
    var patternFrequency = {};
    results.forEach(function(r) {
      r.patterns.forEach(function(p) {
        patternFrequency[p.type] = (patternFrequency[p.type] || 0) + 1;
      });
    });
    var escalationScores = results.map(function(r) { return r.escalationScore; });
    var avgEscalation = Math.round(
      escalationScores.reduce(function(a,b){return a+b;},0) / escalationScores.length
    );
    return {
      totalTexts: texts.length,
      flaggedTexts: flaggedCount,
      flaggedRatio: Math.round((flaggedCount / texts.length) * 100),
      sessionEscalationScore: avgEscalation,
      escalationTrend: detectEscalationTrend(escalationScores),
      dominantPatterns: Object.keys(patternFrequency)
        .sort(function(a,b){ return patternFrequency[b] - patternFrequency[a]; })
        .slice(0, 3),
      patternFrequency: patternFrequency,
      results: results
    };
  }

  return {
    detect: hlDetect,
    batch: hlDetectBatch,
    session: hlDetectSession,
    version: VERSION,
    patterns: PATTERNS.map(function(p) {
      return { id: p.id, severity: p.severity, label: p.label };
    })
  };

}));
