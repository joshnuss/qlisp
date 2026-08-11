; apply's function argument is evaluated like any other argument, so a
; bare builtin/defun name must be quoted (it isn't a variable)
(print (apply '+ (list 1 2 3)))

; and with an inline lambda
(print (apply (lambda (x y) (* x y)) (list 6 7)))

; a quoted defun-defined function works the same way
(defun add3 (a b c) (+ a b c))
(print (apply 'add3 (list 1 2 3)))

; a variable holding a lambda does NOT need quoting: it's already a
; variable, so it evaluates directly to a function value
(define double (lambda (x) (* x 2)))
(print (apply double (list 21)))

; quoted symbols work for any function-namespace binding, e.g. car
(print (apply 'car (list (list 10 20 30))))
