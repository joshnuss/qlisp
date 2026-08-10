(define xs (list 1 2 3))

; full form
(print (quasiquote (a (unquote-splicing xs) b)))

; shorthand: ,@
(print `(a ,@xs b))
