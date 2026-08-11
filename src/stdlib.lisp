; qlisp standard library.
; Loaded into every global environment by createGlobalEnv() in env.ts.
; Definitions that don't need native support (unlike +, car, apply, ...)
; belong here, written in qlisp itself.

(defun 1+ (n) (+ n 1))
(defun 1- (n) (- n 1))

(defun not (x) (if x nil t))

(defun last (lst)
  (if (cdr lst)
      (last (cdr lst))
      (car lst)))
