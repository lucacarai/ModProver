% SPDX-License-Identifier: GPL-3.0-or-later
% ModProver adapter, 2026-10-06. The included upstream file is unchanged.
:- module(tap, [modal_proof/3]).
:- dynamic logic/1.
:- include('/mleantap.pl').

modal_proof(s5, Formula, Verdict) :-
    retractall(logic(_)), assertz(logic(s5)),
    ( call_with_inference_limit(once(prove(Formula)), 300000, Result),
      Result \== inference_limit_exceeded -> Verdict=valid ; Verdict=unknown ).
