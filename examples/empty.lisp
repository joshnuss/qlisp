; empty? is defined in src/stdlib.lisp
; t for zero-length lists or strings. An empty string is empty? even
; though it is NOT null? (a non-empty-string is truthy).
(print (empty? (list)))
(print (empty? ""))
(print (empty? (list 1)))
