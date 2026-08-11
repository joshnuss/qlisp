; apply works with a builtin, resolved via the function namespace
(print (apply + (list 1 2 3)))

; and with an inline lambda
(print (apply (lambda (x y) (* x y)) (list 6 7)))

; and with a defun-defined function
(defun add3 (a b c) (+ a b c))
(print (apply add3 (list 1 2 3)))

; and with a variable holding a lambda
(define double (lambda (x) (* x 2)))
(print (apply double (list 21)))
