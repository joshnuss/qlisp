; funcall is like apply, but arguments are passed directly instead of
; wrapped in a list

; funcall's function argument is evaluated like any other argument, so a
; bare builtin/defun name must be quoted (it isn't a variable)
(print (funcall '+ 1 2 3))

; and with an inline lambda
(print (funcall (lambda (x y) (* x y)) 6 7))

; a quoted defun-defined function works the same way
(defun add3 (a b c) (+ a b c))
(print (funcall 'add3 1 2 3))

; a variable holding a lambda does NOT need quoting: it's already a
; variable, so it evaluates directly to a function value
(define double (lambda (x) (* x 2)))
(print (funcall double 21))

; quoted symbols work for any function-namespace binding, e.g. list
(print (funcall 'list 'a 'b 'c))
