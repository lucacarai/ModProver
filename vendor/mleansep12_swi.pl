%% File: mleansep12_swi.pl  -  Version: 1.2  -  Date: 30th August 2011
%%
%% Purpose: MleanSeP: A Sequent Theorem Prover for Modal Logic
%%
%% Author:  Jens Otten
%% Web:     www.leancop.de/mleansep/
%%
%% Usage:   prove(F).   % where F is a modal first-order formula
%%                      %  e.g. F=(all X: ex Y:(~ *q, #p(Y)=>p(X)))
%%
%% Copyright: (c) 2006-2011 by Jens Otten
%% License:   GNU General Public License

logic(s4).       % specify modal logic (k,k4,d,d4,s4,t)
domain(cumul).   % specify domain condition (const,cumul)


:- op(1130, xfy, <=>). :- op(1110, xfy, =>). :- op(500, fy, ~).
:- op( 500,  fy, all). :- op( 500,  fy, ex). :- op(500,xfy, :).
:- op( 500,  fy, #).   :- op( 500,  fy, *).

%%% prove formula

prove(F) :-
    Time1 is cputime,
    ( domain(const) -> add_barcan(F,F1), prove(F1,1) ;
      domain(cumul) -> prove(F,1) ),
    Time2 is cputime, Time is Time2-Time1, print(Time).

prove(F,VLim) :- display(VLim), nl, prove([],[F],l,[],VLim).
prove(F,VLim) :- \+ no_mul([([F],0)]), VLim1 is VLim+1, prove(F,VLim1).

%%% add barcan formulas ( (all X: # p(X)) => (# all X: p(X)) )

add_barcan(F,F1) :-
    collect_pred([F],PL), PL\=[] -> barcan_axioms(PL,F2),
    ( F=(A=>C) -> F1=((F2,A)=>C) ; F1=(F2=>F) ) ; F1=F.

% generate barcan axioms

barcan_axioms([],[]).
barcan_axioms([(P,I)|PL],F) :-
    barcan_fml(A,B,C,(#P1),P2,I), barcan_axioms(PL,F1), P1=..[P|C],
    P2=..[P|C], F2=(A=>(#B)) , ( F1=[] -> F=F2 ; F=(F2,F1) ).

barcan_fml((all X:E),(all X:F),[X],E,F,1).
barcan_fml((all X:A),(all X:B),[X|C],E,F,I) :-
    I>1, I1 is I-1, barcan_fml(A,B,C,E,F,I1).

% collect predicate symbols

collect_pred([],[]).
collect_pred([F|Fml],PL) :-
    ( ( F=..[<=>|F1] ; F=..[=>|F1] ; F=..[;|F1] ; F=..[','|F1] ;
        F=..[#|F1] ; F=..[*|F1] ;
        F=..[~|F1] ; (F=..[all,_:F2] ; F=..[ex,_:F2]), F1=[F2] ) ->
      collect_pred(F1,PL1) ; F=..[P|Arg], length(Arg,I),
      I>0 -> PL1=[(P,I)] ; PL1=[] ),
    collect_pred(Fml,PL2), union1(PL1,PL2,PL).

union1([],L,L).
union1([H|L1],L2,L3) :- member(H,L2), !, union1(L1,L2,L3).
union1([H|L1],L2,[H|L3]) :- union1(L1,L2,L3).

%%% check multiplicities

no_mul([]).
no_mul([([F],Pol)|T]) :- (F=(A,B);F=(A;B)) ->
                         !, no_mul([([A],Pol),([B],Pol)|T]).
no_mul([([F],Pol)|T]) :- fml(F,Pol,_,L1,R1,L2,R2,_,_,V,U,U), !,
                         V==[], no_mul([(L1,1),(R1,0),(L2,1),(R2,0)|T]).
no_mul([_|T]):- no_mul(T).

%%% specification of inference rules
% fml(formula, polarity, invertible/noninvertible, add to left side
%     of 1st premise, right side of 1st premise, add to left side
%     of 2nd premise, right side of 2nd premise, position, free
%     variables, new free variable, term to be copied, copy of term)

fml((A,B),  1,inv,[A,B],            [], [], [], _, _,[], [], [] ).
fml((A,B),  0,inv,[],               [A],[], [B],_, _,[], [], [] ).
fml((A;B),  1,inv,[A],              [], [B],[], _, _,[], [], [] ).
fml((A;B),  0,inv,[],             [A,B],[], [], _, _,[], [], [] ).
fml((A=>B), 1,inv,[],               [A],[B],[], _, _,[], [], [] ).
fml((A=>B), 0,inv,[A],              [B],[], [], _, _,[], [], [] ).
fml((A<=>B),1,inv,[((A=>B),(B=>A))],[], [], [], _, _,[], [], [] ).
fml((A<=>B),0,inv,[], [((A=>B),(B=>A))],[], [], _, _,[], [], [] ).
fml((~A),   1,inv,[],               [A],[], [], _, _,[], [], [] ).
fml((~A),   0,inv,[A],              [], [], [], _, _,[], [], [] ).
fml(all X:A,1,nin,[C,all X:A],      [], [], [], _, _,[Y],X:A,Y:C).
fml(all X:A,0,inv,[],               [C],[], [], S,FV,[],(X,A),(S^FV,C)).
fml(ex X:A, 1,inv,[C],              [], [], [], S,FV,[],(X,A),(S^FV,C)).
fml(ex X:A, 0,nin,[],        [C,ex X:A],[], [], _, _,[Y],X:A,Y:C).
fml((#A),   1,nin,[C],              [], [], [], _, _,[!], A, C  ).
fml((#A),   0,nin,[],               [A],[], [], _, _,[], [], [] ).
fml((*A),   1,nin,[A],              [], [], [], _, _,[], [], [] ).
fml((*A),   0,nin,[],               [C],[], [], _, _,[!], A, C  ).

%%% specify nu- and pi-rules
% nprule(nu/pi, conclusion, box/diamond, premise)

nprule(Rule,S,Op,S1) :-
    logic(s4) -> ( Rule=nu -> nurule(1,S,Op,S1) ; pirule(1,S,Op,S1) );
    logic(d)  -> ( Rule=nu -> nurule(2,S,Op,S1) ; pirule(2,S,Op,S1) );
    logic(d4) -> ( Rule=nu -> nurule(3,S,Op,S1) ; pirule(3,S,Op,S1) );
    logic(t)  -> ( Rule=nu -> nurule(1,S,Op,S1) ; pirule(2,S,Op,S1) );
    logic(k)  -> ( Rule=nu -> fail              ; pirule(2,S,Op,S1) );
    logic(k4) -> ( Rule=nu -> fail              ; pirule(3,S,Op,S1) ).

nurule(1,F,_,F).
nurule(2,F,Op,F1) :- pirule(2,F,Op,F1).
nurule(3,F,Op,F1) :- pirule(3,F,Op,F1).

pirule(1,[],_,[]).
pirule(1,[F|T],Op,[F|T1]) :- F=..[Op,_], !, pirule(1,T,Op,T1).
pirule(1,[_|T],Op,T1) :- pirule(1,T,Op,T1).

pirule(2,[],_,[]).
pirule(2,[F|T],Op,[F1|T1]) :- F=..[Op,F1], !, pirule(2,T,Op,T1).
pirule(2,[_|T],Op,T1) :- pirule(2,T,Op,T1).

pirule(3,[],_,[]).
pirule(3,[F|T],Op,[F,F1|T1]) :- F=..[Op,F1], !, pirule(3,T,Op,T1).
pirule(3,[_|T],Op,T1) :- pirule(3,T,Op,T1).

%%% proof search
% prove(left side, right side, position, free variables, variable limit)

prove(Left,Right,S,FreeV,VarLim) :-
    ( ( append(LeftA,[F|LeftB],Left), Pol=1,
        append(LeftA,LeftB,LeftP), RightP=Right
        ;
        append(RightA,[F|RightB],Right), Pol=0,
        append(RightA,RightB,RightP), LeftP=Left ),
      fml(F,Pol,inv,L1,R1,L2,R2,S,FreeV,V,Cpy,Cpy1), !
      ;
      ( append(LeftA,[F|LeftB],Left), Pol=1,
        append(LeftA,LeftB,LeftP), RightP=Right
        ;
        append(RightA,[F|RightB],Right), Pol=0,
        append(RightA,RightB,RightP), LeftP=Left),
      fml(F,Pol,nin,L1,R1,L2,R2,S,FreeV,V,Cpy,Cpy1)
    ),
    ( V=[] -> true ; \+ length(FreeV,VarLim) ),
    copy_term((Cpy,FreeV),(Cpy1,FreeV)), append(FreeV,V,FreeV1),
    ( F\=(#_),F\=(*_) ->
       LeftP1=LeftP, RightP1=RightP
       ;
       V=[!] -> ( F=(#_) -> append(LeftP,[F],LeftQ), RightQ=RightP ;
                            LeftQ=LeftP, append(RightP,[F],RightQ) ),
             nprule(nu,LeftQ,#,LeftP1), nprule(nu,RightQ,*,RightP1)
             ;
             nprule(pi,LeftP,#,LeftP1), nprule(pi,RightP,*,RightP1)
    ),
    append(LeftP1,L1,Left1), append(RightP1,R1,Right1),
    append(LeftP1,L2,Left2), append(RightP1,R2,Right2),
    prove(Left1,Right1,l(S),FreeV1,VarLim),
    ( L2=[], R2=[] -> true ; prove(Left2,Right2,r(S),FreeV1,VarLim) ).

prove(Left,Right,_,_,_) :-
    member(F,Left), F\=(#_), F\=(*_), member(F1,Right),
    unify_with_occurs_check(F,F1).

