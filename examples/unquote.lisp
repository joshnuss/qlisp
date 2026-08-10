(define x 5)

; full form
(print (quasiquote (a (unquote x) c)))

; shorthand: ,
(print `(a ,x c))
