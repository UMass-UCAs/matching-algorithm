import { List, Map, Set, Range } from 'immutable';
import { fail } from './util';
import * as uuid from 'uuid';

export function matchingWithCapacity<P,R>(
    proposers: List<P>,
    receivers: List<R>,
    proposerRanking: Map<P, List<R>>,
    receiverRanking: Map<R, List<P>>,
    proposerCapacity: Map<P, number>) {

    let nextModifiedProposer = 0;
    let proposerMap = Map<string, P>();
    let invertedProposerMap = Map<P, List<string>>();

    const modifiedProposers = proposers.flatMap(p => {
        const n = proposerCapacity.get(p, undefined);
        if (n === undefined) {
            return fail(`no capacity for ${p}`);
        }
        return Range(0, n).map(i => {
            let uid = uuid();
            proposerMap = proposerMap.set(uid, p);
            invertedProposerMap = invertedProposerMap
                .update(p, List.of(uid), x => x.push(uid));
            return uid;
        })
    });
    const modifiedProposerRanking = proposerMap.map((p, uid) => {
        let ranking = proposerRanking.get(p, undefined);
        if (ranking === undefined) {
            return fail(`oops 2`);
        }
        return ranking;
    });
    const modifiedReceiverRanking = receiverRanking.map((ps) => {
        return ps.flatMap(p => {
            // NOTE(arjun): This is not intuitive. If the capacity of a proposer
            // is zero, then there will be no UIDs that map to the proposer in
            // proposerMap. This occurs because Range(0, n) produces the empty
            // list. An alternative approach would have been to add an empty
            // list to invertedProposerMap while building modifiedProposers.
            return invertedProposerMap.get(p, List());
        });
    });
    const modifiedMatching = galeShapely(modifiedProposers, receivers,
        modifiedProposerRanking, modifiedReceiverRanking, (key) => {
            return proposerMap.get(key)
        });
    if (modifiedMatching.kind === 'ok') {
        return modifiedMatching.value.map((uid) => {
            const p = proposerMap.get(uid, undefined);
            if (p === undefined) {
                return fail(`oops 4`);
            }
            return p;
        });
    }
    else {
        const who = proposerMap.get(modifiedMatching.who);
        console.log(`Nobody left for ${who}`);
        return fail(`Nobody left for ${who}`);
    }
}

export function galeShapely<P,R,S>(
    proposers: List<P>,
    receivers: List<R>,
    proposerRanking: Map<P, List<R>>,
    receiverRanking: Map<R, List<P>>,
    proposerPrinter: (x: P) => S): { kind: 'ok', value:  Map<R, P> } | { kind: 'exhausted', value: Map<R, P>, who: P } {
    if (receivers.size < proposers.size) {
        return fail(`More receivers than proposers. Stable solution is not
                     possible.`);
    }

    let free = Set(proposers);
    let matching = Map<R, P>();
    let proposer = free.first(undefined);
    let remainingProposals = proposerRanking;
    while (proposer !== undefined) {
        const ranking = remainingProposals.get(proposer, undefined);
        if (ranking === undefined) {
            return fail(`No ranking found for ${proposer}`);
        }
        const best = ranking.first(undefined);
        if (best === undefined) {
            console.log("Exhausted for " + proposerPrinter(proposer));
            free = free.remove(proposer);
        }
        else {
            let fiance = matching.get(best, undefined);
            if (fiance === undefined) {
                matching = matching.set(best, proposer);

                free = free.remove(proposer);
            }
            else {
                const matchRanking = receiverRanking.get(best, undefined);
                if (matchRanking === undefined) {
                    return fail(`No ranking found for ${proposer}`);
                }
                if (matchRanking.indexOf(proposer) < matchRanking.indexOf(fiance)) {
                    const fianceOptions = remainingProposals.get(fiance, undefined)!;
                    if (fianceOptions.size === 0) {
                        // Arjun's hack: if the fiance has no other options, then
                        // don't leave them single. I'm fairly certain this is
                        // all hunky dory.
                        console.log(`Arjun's hack triggered for ${best}`);
                    }
                    else {
                        matching = matching.set(best, proposer);
                        free = free.remove(proposer).add(fiance);
                    }
                }
            }
        }

        remainingProposals = remainingProposals.set(proposer, ranking.rest());
        proposer = free.first(undefined);
    }
    return { kind: 'ok', value: matching };

}