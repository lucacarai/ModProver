% SPDX-License-Identifier: GPL-3.0-or-later
% ModProver adapter, 2026-10-06. The included upstream file is unchanged.
:- module(sep, [modal_proof/3]).
:- dynamic logic/1.
:- include('/mleansep.pl').

modal_proof(Logic, Formula, Verdict) :-
    memberchk(Logic, [k,t,k4,s4,d,d4]),
    retractall(logic(_)), assertz(logic(Logic)),
    % Success proves validity; failure or an inference limit is inconclusive.
    ( call_with_inference_limit(once(prove(Formula)), 300000, Result),
      Result \== inference_limit_exceeded -> Verdict=valid ; Verdict=unknown ).
